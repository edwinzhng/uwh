import { v } from "convex/values";
import { canRegister } from "../src/domain/app-rules";
import {
	programRoomPersonIds,
	reservedRoomId,
} from "../src/domain/managed-rooms";
import {
	accountForRecipient,
	activeMessageRecipient,
	recipientDirectory,
	recipientPersonId,
} from "../src/domain/message-recipients";
import {
	type ConversationKind,
	conversationKind,
} from "../src/domain/messaging";
import {
	normalizeParticipantIds,
	participantPersonIds as resolveParticipantPersonIds,
	sameParticipantIds,
} from "../src/domain/thread-participants";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { threadFor } from "./message_access";
import { blockedIds, canChat, requireChat } from "./moderation";

type Participants = {
	members: { id: string; name: string }[];
	candidates: { id: string; name: string }[];
	kind: ConversationKind;
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
	people: Doc<"members">[],
): string[] =>
	resolveParticipantPersonIds(
		thread.value.accountIds,
		[
			...(thread.value.participantPersonIds ?? []),
			...(thread.pendingPersonIds ?? []),
			...(thread.pendingPersonId ? [thread.pendingPersonId] : []),
			...(thread.recipientPersonId ? [thread.recipientPersonId] : []),
		],
		memberships.map((member) => ({
			id: member.userId,
			personId: member.personId,
		})),
		people.map((person) => person.value.id),
	);
export const current = query({
	args: { threadId: v.string() },
	handler: async (ctx, { threadId }): Promise<Participants> => {
		const { actor, thread, memberships, people } = await contextFor(
			ctx,
			threadId,
		);
		const kind = conversationKind(thread.value);
		const programPeople = programRoomPersonIds(thread.value.id, {
			members: people.map((person) => person.value),
		});
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
						...memberIds(thread, memberships, people),
						...programPeople,
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
			candidates: kind === "direct" || kind === "group" ? candidates : [],
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
		if (reservedRoomId(args.groupId))
			throw new Error("Choose a new group identifier.");
		if (kind !== "direct" && kind !== "group")
			throw new Error(
				"This conversation’s members are managed by the club or event roster.",
			);
		const recipientIds = normalizeParticipantIds(args.recipientIds);
		const accounts = memberships.map(accountFor);
		const knownPersonIds = people.map((person) => person.value.id);
		const additions = recipientIds.map((id) => {
			if (
				!activeMessageRecipient(
					id,
					accounts,
					people.map((row) => row.value),
				)
			)
				throw new Error("Choose an active member");
			const personId = recipientPersonId(id);
			const account = personId
				? accountForRecipient(accounts, personId, actor.userId)
				: accounts.find((account) => account.id === id);
			const person = people.find(
				(person) => person.value.id === (personId ?? account?.personId),
			);
			if (
				(personId && (!person || person.value.mergedInto)) ||
				(!person && !account)
			)
				throw new Error("Choose members of this club.");
			return {
				personId: person?.value.id,
				accountId: account?.id,
			};
		});
		const existingIds = memberIds(thread, memberships, people);
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
		const participantPersonIds = resolveParticipantPersonIds(
			accountIds,
			[
				...existingIds,
				...additions.flatMap((addition) =>
					addition.personId ? [addition.personId] : [],
				),
			],
			accounts,
			knownPersonIds,
		);
		const pendingPersonIds = resolveParticipantPersonIds(
			[],
			[
				...(thread.pendingPersonIds ?? []),
				...(thread.pendingPersonId ? [thread.pendingPersonId] : []),
				...additions.flatMap((addition) =>
					addition.personId && !addition.accountId ? [addition.personId] : [],
				),
			],
			[],
			knownPersonIds,
		);
		if (kind === "direct") {
			if (!args.groupId || args.groupId.length > 160)
				throw new Error("Choose a valid group identifier.");
			const existing = await threadFor(ctx, actor.clubId, args.groupId);
			if (existing) {
				if (
					existing.groupSourceThreadId === args.threadId &&
					existing.groupCreatorId === actor.userId &&
					existing.value.accountIds.includes(actor.userId) &&
					sameParticipantIds(existing.groupSourceRecipientIds, recipientIds)
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
				groupSourceRecipientIds: recipientIds,
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
