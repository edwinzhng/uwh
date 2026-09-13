import { v } from "convex/values";
import { canRegister } from "../src/domain/app-rules";
import {
	accountForRecipient,
	recipientDirectory,
	recipientPersonId,
} from "../src/domain/message-recipients";
import { conversationKind } from "../src/domain/messaging";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { threadFor } from "./message_access";
import { blockedIds, canChat, requireChat } from "./moderation";

type Participants = {
	members: { id: string; name: string }[];
	candidates: { id: string; name: string }[];
	kind: "general" | "event" | "direct" | "group";
	canAdd: boolean;
};
const contextFor = async (
	ctx: QueryCtx,
	threadId: string,
): Promise<{
	actor: Doc<"memberships">;
	thread: Doc<"conversations">;
	memberships: Doc<"memberships">[];
	people: Doc<"members">[];
}> => {
	const actor = await requireMember(ctx);
	const thread = await threadFor(ctx, actor.clubId, threadId);
	if (!thread || !thread.value.accountIds.includes(actor.userId))
		throw new Error("Conversation unavailable.");
	const [memberships, people] = await Promise.all([
		ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect(),
		ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.collect(),
	]);
	return { actor, thread, memberships, people };
};
const memberIds = (
	thread: Doc<"conversations">,
	memberships: Doc<"memberships">[],
): string[] => [
	...new Set([
		...thread.value.accountIds,
		...(thread.value.participantPersonIds ?? []),
		...(thread.pendingPersonIds ?? []),
		...(thread.pendingPersonId ? [thread.pendingPersonId] : []),
		...(thread.recipientPersonId ? [thread.recipientPersonId] : []),
		...memberships
			.filter((member) => thread.value.accountIds.includes(member.userId))
			.map((member) => member.personId),
	]),
];
export const current = query({
	args: { threadId: v.string() },
	handler: async (ctx, { threadId }): Promise<Participants> => {
		const { actor, thread, memberships, people } = await contextFor(
			ctx,
			threadId,
		);
		const kind = conversationKind(thread.value);
		const event = thread.value.eventId
			? await ctx.db
					.query("events")
					.withIndex("by_club_and_key", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.id", thread.value.eventId ?? ""),
					)
					.unique()
			: undefined;
		const included =
			kind === "general"
				? people.map((person) => person.value.id)
				: [
						...memberIds(thread, memberships),
						...(event
							? people
									.filter(
										(person) =>
											canRegister(person.value, event.value) &&
											(event.value.program === "all" ||
												person.value.programs.includes(event.value.program)),
									)
									.map((person) => person.value.id)
							: []),
					];
		const members = [
			...people
				.filter((person) => included.includes(person.value.id))
				.map((person) => ({
					id: `person:${person.value.id}`,
					name: person.value.name,
				})),
			...memberships
				.filter(
					(member) =>
						thread.value.accountIds.includes(member.userId) &&
						!people.some((person) => person.value.id === member.personId),
				)
				.map((member) => ({ id: member.userId, name: member.name })),
		].toSorted((a, b) => a.name.localeCompare(b.name));
		const [blocked, restrictions] = await Promise.all([
			blockedIds(ctx, actor.userId),
			ctx.db
				.query("chatRestrictions")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.collect(),
		]);
		const paused = restrictions.some(
			(restriction) => restriction.userId === actor.userId,
		);
		const candidates = recipientDirectory(
			memberships.map(accountFor),
			people.map((person) => person.value),
			actor.userId,
			[...blocked, ...restrictions.map((restriction) => restriction.userId)],
			paused,
		).recipients.filter(
			(person) => !members.some((member) => member.id === person.id),
		);
		return {
			members,
			candidates,
			kind,
			canAdd:
				!paused &&
				(kind === "direct" || kind === "group") &&
				!thread.value.accountIds.some((id) => blocked.includes(id)),
		};
	},
});
export const add = mutation({
	args: {
		threadId: v.string(),
		recipientIds: v.array(v.string()),
		groupId: v.string(),
	},
	handler: async (ctx, args): Promise<string> => {
		const { actor, thread, memberships, people } = await contextFor(
			ctx,
			args.threadId,
		);
		await requireChat(ctx, actor, args.threadId);
		const kind = conversationKind(thread.value);
		if (kind !== "direct" && kind !== "group")
			throw new Error(
				"This conversation’s members are managed by the club or event roster.",
			);
		const recipientIds = [...new Set(args.recipientIds)];
		if (!recipientIds.length || recipientIds.length > 50)
			throw new Error("Choose 1–50 people to add.");
		const accounts = memberships.map(accountFor);
		const additions = recipientIds.map((id) => {
			const personId = recipientPersonId(id);
			const person = personId
				? people.find((person) => person.value.id === personId)
				: undefined;
			const account = personId
				? accountForRecipient(accounts, personId, actor.userId)
				: accounts.find((account) => account.id === id);
			if ((personId && !person) || (!person && !account))
				throw new Error("Choose members of this club.");
			return {
				personId: person?.value.id ?? account?.personId,
				accountId: account?.id,
			};
		});
		const existingIds = memberIds(thread, memberships);
		if (
			!additions.some((addition) =>
				addition.personId
					? !existingIds.includes(addition.personId)
					: addition.accountId &&
						!thread.value.accountIds.includes(addition.accountId),
			)
		) {
			if (kind === "group") return args.threadId;
			throw new Error("Those members are already in this conversation.");
		}
		for (const addition of additions) {
			if (!addition.accountId) continue;
			const membership = memberships.find(
				(member) => member.userId === addition.accountId,
			);
			if (!membership || !(await canChat(ctx, membership.userId)))
				throw new Error("Messaging is unavailable for a selected member.");
			const blocked = await blockedIds(ctx, membership.userId);
			if (
				[
					...thread.value.accountIds,
					...additions.flatMap((value) =>
						value.accountId ? [value.accountId] : [],
					),
				].some((id) => blocked.includes(id))
			)
				throw new Error("Messaging is unavailable between these members.");
		}
		const accountIds = [
			...new Set([
				...thread.value.accountIds,
				...additions.flatMap((addition) =>
					addition.accountId ? [addition.accountId] : [],
				),
			]),
		];
		const participantPersonIds = [
			...new Set([
				...existingIds,
				...additions.flatMap((addition) =>
					addition.personId ? [addition.personId] : [],
				),
			]),
		];
		const pendingPersonIds = [
			...new Set([
				...(thread.pendingPersonIds ?? []),
				...(thread.pendingPersonId ? [thread.pendingPersonId] : []),
				...additions.flatMap((addition) =>
					addition.personId && !addition.accountId ? [addition.personId] : [],
				),
			]),
		];
		if (kind === "direct") {
			if (!args.groupId || args.groupId.length > 160)
				throw new Error("Choose a valid group identifier.");
			const existing = await threadFor(ctx, actor.clubId, args.groupId);
			if (existing) {
				if (
					existing.groupSourceThreadId === args.threadId &&
					existing.groupCreatorId === actor.userId
				)
					return existing.value.id;
				throw new Error("That group identifier is already in use.");
			}
			const names = people
				.filter((person) => participantPersonIds.includes(person.value.id))
				.map(
					(person) => person.value.name.split(" ").at(0) ?? person.value.name,
				);
			await ctx.db.insert("conversations", {
				clubId: actor.clubId,
				groupSourceThreadId: args.threadId,
				groupCreatorId: actor.userId,
				pendingPersonIds,
				value: {
					id: args.groupId,
					title:
						names.slice(0, 3).join(", ") +
						(names.length > 3 ? ` +${names.length - 3}` : ""),
					subtitle: "Group chat",
					kind: "group",
					accountIds,
					participantPersonIds,
				},
			});
			return args.groupId;
		}
		await ctx.db.patch(thread._id, {
			pendingPersonIds,
			value: { ...thread.value, accountIds, participantPersonIds },
		});
		for (const userId of accountIds.filter(
			(id) => !thread.value.accountIds.includes(id),
		)) {
			const membership = memberships.find((member) => member.userId === userId);
			if (!membership) continue;
			const read = await ctx.db
				.query("conversationReads")
				.withIndex("by_user_thread", (q) =>
					q.eq("userId", membership.userId).eq("threadId", args.threadId),
				)
				.unique();
			if (!read)
				await ctx.db.insert("conversationReads", {
					clubId: actor.clubId,
					userId: membership.userId,
					threadId: args.threadId,
					through: 0,
				});
		}
		return args.threadId;
	},
});
