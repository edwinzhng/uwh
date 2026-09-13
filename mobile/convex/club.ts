import { v } from "convex/values";
import { initialAppData } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { Account, AppAction, AppData } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { clubTimestamp, signupState } from "../src/domain/event-time";
import { defaultClubTimeZone } from "../src/domain/time-zones";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { actionData } from "./action_data";
import { appAction } from "./action_validator";
import { loadData, saveData } from "./data";
import { accountFor, getAuthUserId } from "./identity";
import { applyMessage } from "./message_commands";
import { notifyChanges } from "./notification_events";
import { screenData } from "./screen_data";
import { syncEditedSeries } from "./session_series";
import { scheduleSignup } from "./signup";

const membershipFor = async (
	ctx: QueryCtx,
): Promise<Doc<"memberships"> | undefined> => {
	const userId = await getAuthUserId(ctx);
	if (!userId) return undefined;
	return (
		(await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first()) ?? undefined
	);
};
type Workspace = {
	clubId: Id<"clubs">;
	data: AppData;
	account: Account;
	accounts: Account[];
	requests: { id: Id<"joinRequests">; name: string }[];
};
export const current = query({
	args: { screen: v.optional(v.string()), id: v.optional(v.string()) },
	handler: async (ctx, { screen, id }): Promise<Workspace | null> => {
		const membership = await membershipFor(ctx);
		if (!membership) return null;
		const account = accountFor(membership);
		const [data, memberships, requests] = await Promise.all([
			screen
				? screenData(ctx, membership, screen, id)
				: loadData(ctx, membership.clubId).then((result) => result.data),
			!screen || ["settings", "messages", "member"].includes(screen)
				? ctx.db
						.query("memberships")
						.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
						.collect()
				: [membership],
			membership.admin && (!screen || screen === "settings")
				? ctx.db
						.query("joinRequests")
						.withIndex("by_club_state", (q) =>
							q.eq("clubId", membership.clubId).eq("state", "pending"),
						)
						.collect()
				: [],
		]);
		return {
			clubId: membership.clubId,
			data: visibleAppData(data, account),
			account,
			accounts: memberships.map((entry) =>
				entry.userId === account.id || account.admin
					? accountFor(entry)
					: {
							id: entry.userId,
							name: entry.name,
							personId: entry.personId,
							children: [],
							coachPrograms: entry.coachPrograms.length ? ["club"] : [],
							admin: entry.admin,
						},
			),
			requests: requests
				.filter((entry) => entry.state === "pending")
				.map((entry) => ({ id: entry._id, name: entry.name })),
		};
	},
});
export const apply = mutation({
	args: { action: appAction },
	handler: async (ctx, { action }): Promise<string | null> => {
		const membership = await membershipFor(ctx);
		if (!membership) throw new Error("Sign in and join a club first.");
		const account = accountFor(membership);
		if (
			action.type === "registration" ||
			action.type === "payment" ||
			(action.type === "tracker-value" && action.trackerId === "membership")
		) {
			const personId =
				action.type === "payment" ? action.payment.personId : action.personId;
			const migrated = await ctx.db
				.query("seasonRecords")
				.withIndex("by_club_season_person", (q) =>
					q
						.eq("clubId", membership.clubId)
						.eq("seasonId", "2026-2027")
						.eq("personId", personId),
				)
				.unique();
			if (migrated) throw new Error("Refresh the app to edit season records.");
		}
		if (
			action.type === "create-thread" ||
			action.type === "send-message" ||
			action.type === "edit-message" ||
			action.type === "delete-message" ||
			action.type === "set-reaction"
		)
			return applyMessage(ctx, membership, action);
		const club =
			action.type === "create-event"
				? await ctx.db.get(membership.clubId)
				: undefined;
		const effectiveAction: AppAction =
			action.type === "create-event"
				? {
						...action,
						draft: {
							...action.draft,
							timeZone:
								(action.draft.kind === "tournament"
									? action.draft.timeZone
									: undefined) ??
								club?.timeZone ??
								defaultClubTimeZone,
						},
					}
				: action;
		const { data, rows } = await actionData(
			ctx,
			membership.clubId,
			effectiveAction,
		);
		const currentData = {
			...data,
			events: data.events.map((event) => ({
				...event,
				signup: signupState(event, Date.now()),
			})),
		};
		const next = reduceApp(currentData, account, effectiveAction);
		await saveData(ctx, membership.clubId, rows, next);
		if (
			action.type === "create-event" &&
			action.draft.committedRoster &&
			action.draft.repeat !== "once"
		) {
			const existing = await ctx.db
				.query("sessionSeries")
				.withIndex("by_key", (q) =>
					q.eq("clubId", membership.clubId).eq("id", action.id),
				)
				.unique();
			if (!existing)
				await ctx.db.insert("sessionSeries", {
					clubId: membership.clubId,
					id: action.id,
					seriesIds: [action.id],
					title: action.draft.title.trim(),
					capacity: action.draft.capacity,
					waitlist: action.draft.seriesWaitlist ?? true,
					enrollments: [],
				});
		}
		await notifyChanges(ctx, membership.clubId, membership.userId, data, next);
		if (action.type === "create-event" || action.type === "edit-event") {
			await syncEditedSeries(ctx, membership.clubId, data.events, next.events);
			for (const event of next.events.filter(
				(event) =>
					JSON.stringify(
						data.events.find((previous) => previous.id === event.id),
					) !== JSON.stringify(event),
			))
				await scheduleSignup(ctx, membership.clubId, event);
		}
		return null;
	},
});
export const create = mutation({
	args: { name: v.string(), samples: v.boolean() },
	handler: async (ctx, { name, samples }): Promise<Id<"clubs">> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in first.");
		if (await membershipFor(ctx))
			throw new Error("You already belong to a club.");
		if (!name.trim()) throw new Error("Add a club name.");
		const user = await ctx.db.get(userId);
		const personName = user?.name ?? "Club owner";
		const clubId = await ctx.db.insert("clubs", {
			name: name.trim(),
			timeZone: defaultClubTimeZone,
			ownerId: userId,
			reminders: true,
		});
		const { rows } = await loadData(ctx, clubId);
		const owner = {
			id: "alex",
			name: personName,
			programs: ["club"],
			position: "Center",
			rating: 3,
			registration: "approved" as const,
			goal: "Create space after the pass",
			steps: 0,
		};
		const data: AppData = samples
			? {
					...initialAppData,
					clubName: name.trim(),
					members: initialAppData.members.map((entry) =>
						entry.id === "alex" ? owner : entry,
					),
					conversations: initialAppData.conversations.map((entry) => ({
						...entry,
						accountIds: [userId],
					})),
					feedback: initialAppData.feedback.map((entry) =>
						entry.authorId === "alex" ? { ...entry, authorId: userId } : entry,
					),
				}
			: {
					...initialAppData,
					clubName: name.trim(),
					members: [owner],
					events: [],
					responses: [],
					teams: [],
					plans: {},
					feedback: [],
					conversations: [
						{
							id: "club",
							title: "Club room",
							subtitle: "Club members",
							accountIds: [userId],
						},
					],
					messages: [],
					notices: [],
					equipment: [],
					loans: [],
					charges: [],
					payments: [],
					trackers: [],
					trackerValues: {},
				};
		const scheduled = {
			...data,
			events: data.events.map((event) => {
				const timeZone = event.timeZone ?? defaultClubTimeZone;
				const start = clubTimestamp(event.date, event.start, timeZone);
				const timed = {
					...event,
					timeZone,
					opensAt:
						event.signup === "scheduled" ? start - 39 * 3600000 : Date.now(),
					closesAt: start,
				};
				return { ...timed, signup: signupState(timed, Date.now()) };
			}),
		};
		await saveData(ctx, clubId, rows, scheduled);
		for (const event of scheduled.events)
			await scheduleSignup(ctx, clubId, event);
		await ctx.db.insert("memberships", {
			clubId,
			userId,
			name: personName,
			personId: "alex",
			children: samples ? ["sam", "mila"] : [],
			coachPrograms: ["club", "youth"],
			admin: true,
		});
		return clubId;
	},
});
export const requestToJoin = mutation({
	args: { clubCode: v.string() },
	handler: async (ctx, { clubCode }): Promise<null> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in first.");
		const clubId = ctx.db.normalizeId("clubs", clubCode.trim());
		if (!clubId || !(await ctx.db.get(clubId)))
			throw new Error("Club code not found.");
		if (await membershipFor(ctx))
			throw new Error("You already belong to a club.");
		const existing = await ctx.db
			.query("joinRequests")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		if (
			existing.some(
				(entry) => entry.clubId === clubId && entry.state === "pending",
			)
		)
			return null;
		const user = await ctx.db.get(userId);
		await ctx.db.insert("joinRequests", {
			userId,
			clubId,
			name: user?.name ?? "Member",
			state: "pending",
		});
		return null;
	},
});
export const setAccess = mutation({
	args: {
		accountId: v.string(),
		children: v.array(v.string()),
		coachPrograms: v.array(v.string()),
		admin: v.boolean(),
	},
	handler: async (ctx, args): Promise<null> => {
		const actor = await membershipFor(ctx);
		if (!actor?.admin) throw new Error("Administrator access required.");
		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		const target = memberships.find((entry) => entry.userId === args.accountId);
		if (!target) throw new Error("Account not found.");
		const club = await ctx.db.get(actor.clubId);
		if (club?.ownerId === target.userId && !args.admin)
			throw new Error("The club owner must remain an administrator.");
		const { data } = await loadData(ctx, actor.clubId, {
			select: { members: [target.personId, ...args.children] },
		});
		if (
			!args.children.every(
				(id) =>
					id !== target.personId &&
					data.members.some((entry) => entry.id === id),
			)
		)
			throw new Error("Choose valid child profiles.");
		if (!args.coachPrograms.every((id) => id === "club" || id === "youth"))
			throw new Error("Choose valid programs.");
		await ctx.db.patch(target._id, {
			children: [...new Set(args.children)],
			coachPrograms: [...new Set(args.coachPrograms)],
			admin: args.admin,
		});
		const personalPrograms = data.members
			.filter(
				(entry) =>
					entry.id === target.personId || args.children.includes(entry.id),
			)
			.flatMap((entry) => entry.programs);
		const channels = await ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect();
		for (const channel of channels) {
			if (channel.value.id !== "club" && channel.value.id !== "youth") continue;
			const allowed =
				personalPrograms.includes(channel.value.id) ||
				args.coachPrograms.includes(channel.value.id);
			const others = channel.value.accountIds.filter(
				(id) => id !== target.userId,
			);
			await ctx.db.patch(channel._id, {
				value: {
					...channel.value,
					accountIds: allowed ? [...others, target.userId] : others,
				},
			});
		}
		return null;
	},
});
export const approveRequest = mutation({
	args: {
		requestId: v.id("joinRequests"),
		personId: v.string(),
		children: v.array(v.string()),
		coachPrograms: v.array(v.string()),
		admin: v.boolean(),
	},
	handler: async (ctx, args): Promise<null> => {
		const membership = await membershipFor(ctx);
		const request = await ctx.db.get(args.requestId);
		if (
			!membership?.admin ||
			!request ||
			request.clubId !== membership.clubId ||
			request.state !== "pending"
		)
			throw new Error("Request unavailable.");
		if (
			await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", request.userId))
				.first()
		)
			throw new Error("This account already belongs to a club.");
		const { data } = await loadData(ctx, membership.clubId, {
			select: { members: [args.personId, ...args.children] },
		});
		if (
			![args.personId, ...args.children].every((id) =>
				data.members.some((entry) => entry.id === id),
			) ||
			args.children.includes(args.personId)
		)
			throw new Error("Choose valid profiles.");
		if (!args.coachPrograms.every((id) => id === "club" || id === "youth"))
			throw new Error("Choose valid programs.");
		const existing = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
			.collect();
		if (
			existing.some(
				(entry) =>
					entry.personId === args.personId || entry.userId === request.userId,
			)
		)
			throw new Error("This account or profile is already linked.");
		await ctx.db.insert("memberships", {
			clubId: membership.clubId,
			userId: request.userId,
			name: request.name,
			personId: args.personId,
			children: [...new Set(args.children)],
			coachPrograms: [...new Set(args.coachPrograms)],
			admin: args.admin,
		});
		const channels = await ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
			.collect();
		const people = data.members.filter(
			(entry) => entry.id === args.personId || args.children.includes(entry.id),
		);
		for (const channel of channels) {
			if (
				(channel.value.id === "club" &&
					(people.some((entry) => entry.programs.includes("club")) ||
						args.coachPrograms.includes("club"))) ||
				(channel.value.id === "youth" &&
					(people.some((entry) => entry.programs.includes("youth")) ||
						args.coachPrograms.includes("youth")))
			)
				await ctx.db.patch(channel._id, {
					value: {
						...channel.value,
						accountIds: [...channel.value.accountIds, request.userId],
					},
				});
		}
		await ctx.db.patch(request._id, { state: "approved" });
		return null;
	},
});
