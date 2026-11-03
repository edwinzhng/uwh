import { v } from "convex/values";
import { initialAppData } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { Account, AppAction, AppData } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { registeredMemberCount } from "../src/domain/club-summary";
import { clubDate, clubTimestamp, signupState } from "../src/domain/event-time";
import { endMemberEnrollments } from "../src/domain/member-lifecycle";
import { clubPrograms } from "../src/domain/programs";
import { defaultClubTimeZone } from "../src/domain/time-zones";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { actionData } from "./action_data";
import { appAction } from "./action_validator";
import { loadData, saveData } from "./data";
import { ensureGeneralChat } from "./general_chat";
import { revokeRemovedHouseholdLinks } from "./household_cleanup";
import { accountFor, getAuthUserId, requireMember } from "./identity";
import { rejectMergedAliasAction } from "./member_alias_guard";
import { applyMessage } from "./message_commands";
import { notifyChanges } from "./notification_events";
import { claimPendingMessages } from "./pending_messages";
import {
	programCommandWasApplied,
	recordProgramCommand,
} from "./program_commands";
import { screenData } from "./screen_data";
import { syncEditedSeries, synchronizeSeries } from "./session_series";
import { scheduleSignup } from "./signup";
import { requireAcceptedTerms } from "./terms_access";

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
const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomInviteCode = (): string =>
	Array.from(
		{ length: 6 },
		() =>
			inviteAlphabet.at(Math.floor(Math.random() * inviteAlphabet.length)) ??
			"A",
	).join("");
const createInviteCode = async (
	ctx: MutationCtx,
	attempt = 0,
): Promise<string> => {
	if (attempt >= 20) throw new Error("Could not create an invite code.");
	const code = randomInviteCode();
	const existing = await ctx.db
		.query("clubs")
		.withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
		.unique();
	return existing ? createInviteCode(ctx, attempt + 1) : code;
};
type Workspace = {
	clubId: Id<"clubs">;
	inviteCode: string;
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
		const [club, data, memberships, requests] = await Promise.all([
			ctx.db.get(membership.clubId),
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
			inviteCode: club?.inviteCode ?? membership.clubId,
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
		await requireAcceptedTerms(ctx, membership);
		const account = accountFor(membership);
		if (
			action.type === "save-program" &&
			(await programCommandWasApplied(ctx, membership, action))
		)
			return null;
		await rejectMergedAliasAction(ctx, membership.clubId, action);
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
		if (action.type === "delete-program") {
			if (!membership.admin)
				throw new Error("Only admins can change programs.");
			const resources = await ctx.db
				.query("resources")
				.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
				.take(5001);
			if (
				resources.length > 5000 ||
				resources.some((resource) => resource.programIds?.includes(action.id))
			)
				throw new Error(
					"This program may have shared resources. Archive it instead.",
				);
			const accounts = await ctx.db
				.query("memberships")
				.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
				.collect();
			if (accounts.some((entry) => entry.coachPrograms.includes(action.id)))
				throw new Error(
					"This program has coaching permissions. Archive it instead.",
				);
		}
		const next = reduceApp(currentData, account, effectiveAction);
		await saveData(ctx, membership.clubId, rows, next);
		if (action.type === "set-member-archived") {
			const series = await ctx.db
				.query("sessionSeries")
				.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
				.collect();
			const club = await ctx.db.get(membership.clubId);
			for (const entry of series.filter((item) =>
				item.enrollments.some(
					(enrollment) => enrollment.personId === action.personId,
				),
			)) {
				const updated = action.archived
					? endMemberEnrollments(
							entry,
							action.personId,
							clubDate(undefined, club?.timeZone),
						)
					: entry;
				await ctx.db.patch(entry._id, { enrollments: updated.enrollments });
				await synchronizeSeries(ctx, membership.clubId, updated);
			}
		}
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
					waitlist: false,
					enrollments: [],
				});
		}
		await notifyChanges(ctx, membership.clubId, membership.userId, data, next);
		if (
			action.type === "create-event" ||
			action.type === "edit-event" ||
			action.type === "save-program"
		) {
			await syncEditedSeries(ctx, membership.clubId, data.events, next.events);
			for (const event of next.events.filter(
				(event) =>
					JSON.stringify(
						data.events.find((previous) => previous.id === event.id),
					) !== JSON.stringify(event),
			))
				await scheduleSignup(ctx, membership.clubId, event);
		}
		if (action.type === "save-program")
			await recordProgramCommand(ctx, membership, action);
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
			inviteCode: await createInviteCode(ctx),
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
							title: "General",
							subtitle: "All club members",
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
		const normalizedCode = clubCode.trim().toUpperCase();
		if (!/^[A-Z0-9]{6}$/.test(normalizedCode))
			throw new Error("Enter the 6-character invite code.");
		const club = await ctx.db
			.query("clubs")
			.withIndex("by_invite_code", (q) => q.eq("inviteCode", normalizedCode))
			.unique();
		if (!club) throw new Error("Invite code not found.");
		const clubId = club._id;
		if (await membershipFor(ctx))
			throw new Error("You already belong to a club.");
		const user = await ctx.db.get(userId);
		const name = user?.name?.trim() || "Member";
		const personId = `account-${userId}`;
		const action: AppAction = {
			type: "add-member",
			member: {
				id: personId,
				name,
				programs: ["club"],
				position: "Player",
				rating: 3,
				registration: "missing",
				goal: "",
				steps: 0,
			},
			charge: 0,
		};
		const { data, rows } = await actionData(ctx, clubId, action);
		const actor: Account = {
			id: userId,
			name,
			personId,
			children: [],
			coachPrograms: [],
			admin: true,
		};
		await saveData(ctx, clubId, rows, reduceApp(data, actor, action));
		const membershipId = await ctx.db.insert("memberships", {
			userId,
			clubId,
			name,
			personId,
			children: [],
			coachPrograms: [],
			admin: false,
		});
		await claimPendingMessages(ctx, membershipId);
		const channels = await ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect();
		for (const channel of channels.filter(
			(channel) => channel.value.id === "club",
		))
			await ctx.db.patch(channel._id, {
				value: {
					...channel.value,
					accountIds: [...new Set([...channel.value.accountIds, userId])],
				},
			});
		return null;
	},
});
export const backfillInviteCodes = internalMutation({
	args: {},
	handler: async (ctx): Promise<string[]> => {
		const clubs = await ctx.db.query("clubs").collect();
		return Promise.all(
			clubs.map(async (club): Promise<string> => {
				if (club.inviteCode) return club.inviteCode;
				const inviteCode = await createInviteCode(ctx);
				await ctx.db.patch(club._id, { inviteCode });
				return inviteCode;
			}),
		);
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
		await requireAcceptedTerms(ctx, actor);
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
					data.members.some((entry) => entry.id === id && !entry.mergedInto),
			)
		)
			throw new Error("Choose valid child profiles.");
		if (
			!args.coachPrograms.every((id) =>
				clubPrograms(data).some(
					(program) => program.id === id && !program.archived,
				),
			)
		)
			throw new Error("Choose valid programs.");
		await ctx.db.patch(target._id, {
			children: [...new Set(args.children)],
			coachPrograms: [...new Set(args.coachPrograms)],
			admin: args.admin,
		});
		await revokeRemovedHouseholdLinks(ctx, target, args.children);
		await claimPendingMessages(ctx, target._id);
		await ensureGeneralChat(ctx, actor.clubId);
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
		await requireAcceptedTerms(ctx, membership);
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
				data.members.some((entry) => entry.id === id && !entry.mergedInto),
			) ||
			args.children.includes(args.personId)
		)
			throw new Error("Choose valid profiles.");
		if (
			!args.coachPrograms.every((id) =>
				clubPrograms(data).some(
					(program) => program.id === id && !program.archived,
				),
			)
		)
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
		const membershipId = await ctx.db.insert("memberships", {
			clubId: membership.clubId,
			userId: request.userId,
			name: request.name,
			personId: args.personId,
			children: [...new Set(args.children)],
			coachPrograms: [...new Set(args.coachPrograms)],
			admin: args.admin,
		});
		await claimPendingMessages(ctx, membershipId);
		const channels = await ctx.db
			.query("conversations")
			.withIndex("by_club", (q) => q.eq("clubId", membership.clubId))
			.collect();
		const people = data.members.filter(
			(entry) => entry.id === args.personId || args.children.includes(entry.id),
		);
		for (const channel of channels) {
			if (
				channel.value.id === "club" ||
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

export const summary = query({
	args: { seasonId: v.string() },
	handler: async (ctx, { seasonId }): Promise<{ registered?: number }> => {
		const actor = await requireMember(ctx);
		const limit = 2000;
		const [members, records] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.take(limit + 1),
			ctx.db
				.query("seasonRecords")
				.withIndex("by_club_season_person", (q) =>
					q.eq("clubId", actor.clubId).eq("seasonId", seasonId),
				)
				.take(limit + 1),
		]);
		if (members.length > limit || records.length > limit) return {};
		return {
			registered: registeredMemberCount(
				members.map((row) => row.value),
				seasonId,
				records,
			),
		};
	},
});
