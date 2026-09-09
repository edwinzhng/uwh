import { getAuthSessionId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { getAuthUserId, memberFor, requireMember } from "./identity";
import { blockedIds } from "./moderation";
import { notificationKind } from "./security_schema";

export const defaultPreferences = {
	messages: true,
	events: true,
	feedback: true,
	announcements: true,
};
export const settings = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{ preferences: typeof defaultPreferences; devices: number }> => {
		const member = await memberFor(ctx);
		if (!member) return { preferences: defaultPreferences, devices: 0 };
		const preferences = await ctx.db
			.query("pushPreferences")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.unique();
		const devices = await ctx.db
			.query("pushDevices")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.collect();
		return {
			preferences: preferences
				? {
						messages: preferences.messages,
						events: preferences.events,
						feedback: preferences.feedback,
						announcements: preferences.announcements,
					}
				: defaultPreferences,
			devices: devices.length,
		};
	},
});
export const preferences = mutation({
	args: {
		kind: notificationKind,
		enabled: v.boolean(),
	},
	handler: async (ctx, args): Promise<void> => {
		const member = await requireMember(ctx);
		const previous = await ctx.db
			.query("pushPreferences")
			.withIndex("by_user", (q) => q.eq("userId", member.userId))
			.unique();
		if (previous)
			await ctx.db.patch(previous._id, { [args.kind]: args.enabled });
		else
			await ctx.db.insert("pushPreferences", {
				userId: member.userId,
				...defaultPreferences,
				[args.kind]: args.enabled,
			});
	},
});
export const register = mutation({
	args: {
		installationId: v.string(),
		token: v.string(),
		platform: v.union(v.literal("ios"), v.literal("android")),
	},
	handler: async (ctx, args): Promise<void> => {
		const member = await requireMember(ctx);
		const sessionId = await getAuthSessionId(ctx);
		if (
			!sessionId ||
			!/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/.test(args.token) ||
			args.token.length > 200 ||
			!/^[a-zA-Z0-9-]{20,80}$/.test(args.installationId)
		)
			throw new Error("Notification registration failed.");
		const [installation, tokens] = await Promise.all([
			ctx.db
				.query("pushDevices")
				.withIndex("by_installation", (q) =>
					q.eq("installationId", args.installationId),
				)
				.collect(),
			ctx.db
				.query("pushDevices")
				.withIndex("by_token", (q) => q.eq("token", args.token))
				.collect(),
		]);
		const existing = installation.find(
			(device) =>
				device.userId === member.userId &&
				device.sessionId === sessionId &&
				device.token === args.token,
		);
		for (const id of new Set(
			[...installation, ...tokens].map((row) => row._id),
		))
			if (id !== existing?._id) await ctx.db.delete(id);
		if (existing) {
			await ctx.db.patch(existing._id, { updatedAt: Date.now() });
			return;
		}
		await ctx.db.insert("pushDevices", {
			...args,
			userId: member.userId,
			sessionId,
			updatedAt: Date.now(),
		});
	},
});
export const unregister = mutation({
	args: { installationId: v.optional(v.string()) },
	handler: async (ctx, { installationId }): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return;
		const devices = await ctx.db
			.query("pushDevices")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		for (const device of devices.filter(
			(entry) => !installationId || entry.installationId === installationId,
		))
			await ctx.db.delete(device._id);
	},
});

type JobInput = Omit<Doc<"pushJobs">, "_id" | "_creationTime" | "createdAt">;
export const enqueue = async (
	ctx: MutationCtx,
	input: JobInput,
	at = Date.now(),
): Promise<void> => {
	if (
		await ctx.db
			.query("pushJobs")
			.withIndex("by_key", (q) => q.eq("key", input.key))
			.unique()
	)
		return;
	const jobId = await ctx.db.insert("pushJobs", {
		...input,
		createdAt: Date.now(),
	});
	await ctx.scheduler.runAt(
		Math.max(Date.now(), at),
		internal.notifications.fanout,
		{ jobId },
	);
};
const eligible = async (
	ctx: QueryCtx,
	job: Doc<"pushJobs">,
	member: Doc<"memberships">,
): Promise<boolean> => {
	if (member.clubId !== job.clubId || member.userId === job.actorId)
		return false;
	const preferences = await ctx.db
		.query("pushPreferences")
		.withIndex("by_user", (q) => q.eq("userId", member.userId))
		.unique();
	if (preferences && !preferences[job.kind]) return false;
	if (
		job.actorId &&
		(await blockedIds(ctx, member.userId)).includes(job.actorId)
	)
		return false;
	if (job.kind === "messages") {
		const message = await ctx.db
			.query("messages")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", job.clubId).eq("value.id", job.entityId),
			)
			.unique();
		if (!message || message.value.deleted) return false;
		const thread = await ctx.db
			.query("conversations")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", job.clubId).eq("value.id", message.value.threadId),
			)
			.unique();
		return Boolean(thread?.value.accountIds.includes(member.userId));
	}
	if (job.kind === "feedback") {
		const row = await ctx.db
			.query("feedback")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", job.clubId).eq("value.id", job.entityId),
			)
			.unique();
		return (
			row?.value.visibility === "published" &&
			[member.personId, ...member.children].includes(row.value.personId)
		);
	}
	if (job.kind === "announcements")
		return Boolean(
			await ctx.db
				.query("notices")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", job.clubId).eq("value.id", job.entityId),
				)
				.unique(),
		);
	const club = await ctx.db.get(job.clubId);
	const row = await ctx.db
		.query("events")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", job.clubId).eq("value.id", job.entityId),
		)
		.unique();
	const event = row?.value;
	if (
		event &&
		club?.reminders &&
		(job.eventPhase === "changed" || job.eventPhase === "cancelled")
	) {
		if ((job.eventPhase === "cancelled") !== event.cancelled) return false;
		const responses = (
			await Promise.all(
				[member.personId, ...member.children].map((personId) =>
					ctx.db
						.query("responses")
						.withIndex("by_person", (q) =>
							q.eq("clubId", job.clubId).eq("value.personId", personId),
						)
						.collect(),
				),
			)
		).flat();
		const changedIds = new Set(job.eventIds ?? [event.id]);
		return responses.some(
			(response) =>
				changedIds.has(response.value.eventId) &&
				["going", "waiting"].includes(response.value.response),
		);
	}
	if (
		!club?.reminders ||
		!event ||
		event.cancelled ||
		!event.closesAt ||
		Date.now() >= event.closesAt ||
		(event.opensAt && Date.now() < event.opensAt)
	)
		return false;
	if (
		(job.eventPhase === "open" ? event.opensAt : event.closesAt) !==
		job.eventTimestamp
	)
		return false;
	const people = [member.personId, ...member.children].filter(
		(id) =>
			!event.eligiblePersonIds?.length || event.eligiblePersonIds.includes(id),
	);
	const players = await Promise.all(
		people.map((id) =>
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", job.clubId).eq("value.id", id),
				)
				.unique(),
		),
	);
	const eligiblePeople = players
		.filter((person) => person?.value.programs.length)
		.map((person) => person?.value.id);
	const responses = await ctx.db
		.query("responses")
		.withIndex("by_event", (q) =>
			q.eq("clubId", job.clubId).eq("value.eventId", event.id),
		)
		.collect();
	return eligiblePeople.some(
		(personId) =>
			!responses.some(
				(response) =>
					response.value.personId === personId &&
					response.value.eventId === event.id &&
					response.value.response !== "unanswered",
			),
	);
};
export const fanout = internalMutation({
	args: { jobId: v.id("pushJobs") },
	handler: async (ctx, { jobId }): Promise<void> => {
		const job = await ctx.db.get(jobId);
		if (!job) return;
		const members = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", job.clubId))
			.collect();
		const existing = await ctx.db
			.query("pushDeliveries")
			.withIndex("by_job", (q) => q.eq("jobId", jobId))
			.collect();
		for (const member of members) {
			if (!(await eligible(ctx, job, member))) continue;
			const devices = await ctx.db
				.query("pushDevices")
				.withIndex("by_user", (q) => q.eq("userId", member.userId))
				.collect();
			for (const device of devices.filter(
				(entry) =>
					!existing.some((delivery) => delivery.deviceId === entry._id),
			)) {
				const id = await ctx.db.insert("pushDeliveries", {
					jobId,
					deviceId: device._id,
					token: device.token,
					state: "pending",
					attempt: 0,
					updatedAt: Date.now(),
				});
				await ctx.scheduler.runAfter(0, internal.push_transport.send, { id });
			}
		}
	},
});
export const payload = internalQuery({
	args: { id: v.id("pushDeliveries") },
	handler: async (
		ctx,
		{ id },
	): Promise<{
		token: string;
		title: string;
		body: string;
		path: string;
		attempt: number;
	} | null> => {
		const delivery = await ctx.db.get(id);
		if (!delivery || delivery.state !== "pending") return null;
		const [job, device] = await Promise.all([
			ctx.db.get(delivery.jobId),
			ctx.db.get(delivery.deviceId),
		]);
		if (!job || !device || device.token !== delivery.token) return null;
		const [member, session, user] = await Promise.all([
			ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", device.userId))
				.first(),
			ctx.db.get(device.sessionId),
			ctx.db.get(device.userId),
		]);
		if (
			!user?.emailVerificationTime ||
			!session ||
			session.userId !== device.userId ||
			session.expirationTime <= Date.now() ||
			!member ||
			!(await eligible(ctx, job, member))
		)
			return null;
		const message =
			job.kind === "messages"
				? await ctx.db
						.query("messages")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", job.clubId).eq("value.id", job.entityId),
						)
						.unique()
				: undefined;
		const feedback =
			job.kind === "feedback"
				? await ctx.db
						.query("feedback")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", job.clubId).eq("value.id", job.entityId),
						)
						.unique()
				: undefined;
		const path = message
			? `/conversation?id=${encodeURIComponent(message.value.threadId)}`
			: job.kind === "events"
				? `/session?event=${encodeURIComponent(job.entityId)}`
				: feedback
					? `/member?id=${encodeURIComponent(feedback.value.personId)}&tab=progress`
					: "/messages?tab=notices";
		const body =
			job.kind === "messages"
				? "You have a new message."
				: job.kind === "feedback"
					? "New coaching feedback is ready."
					: job.kind === "announcements"
						? "Your club posted an announcement."
						: job.eventPhase === "open"
							? "Registration is open."
							: job.eventPhase === "changed"
								? "An event you signed up for has changed."
								: job.eventPhase === "cancelled"
									? "An event you signed up for was cancelled."
									: "Registration closes in 30 minutes.";
		return {
			token: device.token,
			title: "Crocs Club",
			body,
			path,
			attempt: delivery.attempt,
		};
	},
});
export const record = internalMutation({
	args: {
		id: v.id("pushDeliveries"),
		ticketId: v.optional(v.string()),
		error: v.optional(v.string()),
		retry: v.boolean(),
		delivered: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ id, ticketId, error, retry, delivered },
	): Promise<void> => {
		const row = await ctx.db.get(id);
		if (!row) return;
		if (error === "DeviceNotRegistered") {
			const device = await ctx.db.get(row.deviceId);
			if (device?.token === row.token) await ctx.db.delete(device._id);
		}
		const again = retry && row.attempt < 4;
		await ctx.db.patch(id, {
			state: delivered
				? "delivered"
				: ticketId
					? "sent"
					: again
						? "pending"
						: "failed",
			ticketId: ticketId ?? row.ticketId,
			error,
			attempt: row.attempt + 1,
			updatedAt: Date.now(),
		});
		if (again)
			await ctx.scheduler.runAfter(
				10000 * 2 ** row.attempt,
				internal.push_transport.send,
				{ id },
			);
		if (ticketId)
			await ctx.scheduler.runAfter(900000, internal.push_transport.receipt, {
				id,
				attempt: 0,
			});
	},
});
export const receiptInfo = internalQuery({
	args: { id: v.id("pushDeliveries") },
	handler: async (ctx, { id }): Promise<Doc<"pushDeliveries"> | null> =>
		ctx.db.get(id),
});
