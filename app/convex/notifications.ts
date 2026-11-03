import { getAuthSessionId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { InboxContent } from "../src/domain/inbox";
import { notificationPayload } from "../src/domain/notification-payload";
import {
	defaultNotificationPreferences,
	notificationPreferenceFor,
	resolvedNotificationPreferences,
} from "../src/domain/notification-preferences";
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
import { recordInbox } from "./inbox_store";
import { notificationContent } from "./notification_access";
import { notificationPreference } from "./notification_schema";
import { pushRegistrationPlan } from "./push_registration";
import { recordWebPush } from "./web_push_store";

export const defaultPreferences = defaultNotificationPreferences;
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
			preferences: resolvedNotificationPreferences(preferences ?? undefined),
			devices: devices.length,
		};
	},
});
export const preferences = mutation({
	args: {
		kind: notificationPreference,
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
				messages: true,
				events: true,
				feedback: true,
				announcements: true,
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
		const plan = pushRegistrationPlan([...installation, ...tokens], {
			...args,
			userId: member.userId,
			sessionId,
		});
		for (const id of plan.removeIds) await ctx.db.delete(id);
		if (plan.existingId) return;
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
export const pushEnabled = async (
	ctx: QueryCtx,
	job: Doc<"pushJobs">,
	member: Doc<"memberships">,
	content: InboxContent,
): Promise<boolean> => {
	const preferences = await ctx.db
		.query("pushPreferences")
		.withIndex("by_user", (q) => q.eq("userId", member.userId))
		.unique();
	if (
		!resolvedNotificationPreferences(preferences ?? undefined)[
			notificationPreferenceFor(job.kind, content.topic)
		]
	)
		return false;
	return (
		job.kind !== "events" ||
		(job.topic && job.topic !== "event") ||
		Boolean((await ctx.db.get(job.clubId))?.reminders)
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
			const content = await notificationContent(ctx, job, member, "delivery");
			if (!content) continue;
			await recordInbox(ctx, job, member);
			if (!(await pushEnabled(ctx, job, member, content))) continue;
			await recordWebPush(ctx, job, member);
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
			!member
		)
			return null;
		const content = await notificationContent(ctx, job, member, "delivery");
		if (!content || !(await pushEnabled(ctx, job, member, content)))
			return null;
		const { body, path } = notificationPayload(job, content);
		return {
			token: device.token,
			title: "UWH Club",
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
