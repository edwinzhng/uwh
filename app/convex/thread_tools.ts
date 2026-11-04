import { v } from "convex/values";
import {
	type ChatPoll,
	normalizePollDraft,
	pollMessageId,
	pollMessageTime,
	samePollDraft,
	type ThreadTools,
	updatedPollCounts,
	validatePoll,
	validateVote,
} from "../src/domain/chat-polls";
import { conversationKind } from "../src/domain/messaging";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { checkContent } from "./chat_policy";
import { requireMember } from "./identity";
import { messageFor, threadFor, visibleMessage } from "./message_access";
import { applyMessage } from "./message_commands";
import { blockedIds, requireChat } from "./moderation";
import {
	accessiblePoll,
	pollAnchorAvailable,
	pollSummary,
} from "./poll_access";

const pinPermission = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
	threadId: string,
): Promise<boolean> => {
	const thread = await threadFor(ctx, member.clubId, threadId);
	return Boolean(
		thread?.value.accountIds.includes(member.userId) &&
			(member.admin ||
				member.coachPrograms.length > 0 ||
				["direct", "group"].includes(conversationKind(thread.value))),
	);
};
export const read = query({
	args: { threadId: v.string() },
	handler: async (ctx, { threadId }): Promise<ThreadTools> => {
		const member = await requireMember(ctx);
		const thread = await threadFor(ctx, member.clubId, threadId);
		if (!thread?.value.accountIds.includes(member.userId))
			throw new Error("Conversation unavailable.");
		const [polls, pins, blocked] = await Promise.all([
			ctx.db
				.query("chatPolls")
				.withIndex("by_thread", (q) =>
					q.eq("clubId", member.clubId).eq("threadId", threadId),
				)
				.order("desc")
				.take(40),
			ctx.db
				.query("chatPins")
				.withIndex("by_thread", (q) =>
					q.eq("clubId", member.clubId).eq("threadId", threadId),
				)
				.take(3),
			blockedIds(ctx, member.userId),
		]);
		const messages = await Promise.all(
			pins.map((pin) => messageFor(ctx, member.clubId, pin.messageId)),
		);
		const summaries = await Promise.all(
			polls
				.filter((poll) => !blocked.includes(poll.createdBy))
				.map(
					async (poll): Promise<ChatPoll | undefined> =>
						(await pollAnchorAvailable(ctx, poll))
							? pollSummary(ctx, member, poll)
							: undefined,
				),
		);
		return {
			canPin: await pinPermission(ctx, member, threadId),
			pins: messages.flatMap((message) =>
				message &&
				!message.value.deleted &&
				!blocked.includes(message.value.accountId)
					? [visibleMessage(message.value, blocked)]
					: [],
			),
			polls: summaries.filter((poll) => poll !== undefined),
		};
	},
});
export const poll = query({
	args: { threadId: v.string(), pollId: v.string() },
	handler: async (ctx, { threadId, pollId }): Promise<ChatPoll | null> => {
		const member = await requireMember(ctx);
		const id = ctx.db.normalizeId("chatPolls", pollId);
		const value = id ? await ctx.db.get(id) : undefined;
		return value &&
			value.threadId === threadId &&
			(await accessiblePoll(ctx, member, value))
			? pollSummary(ctx, member, value)
			: null;
	},
});
export const create = mutation({
	args: {
		threadId: v.string(),
		key: v.string(),
		question: v.string(),
		options: v.array(v.string()),
		multiple: v.boolean(),
		closesAt: v.optional(v.number()),
	},
	handler: async (ctx, draft): Promise<string> => {
		const member = await requireMember(ctx);
		await requireChat(ctx, member, draft.threadId);
		if (!draft.key || draft.key.length > 120)
			throw new Error("Invalid request key.");
		const previous = await ctx.db
			.query("chatPolls")
			.withIndex("by_key", (q) =>
				q.eq("clubId", member.clubId).eq("key", draft.key),
			)
			.unique();
		if (previous) {
			if (
				previous.createdBy !== member.userId ||
				previous.threadId !== draft.threadId ||
				!samePollDraft(previous, draft) ||
				!(await pollAnchorAvailable(ctx, previous))
			)
				throw new Error("Invalid request key.");
			return previous._id;
		}
		const error = validatePoll(draft);
		if (error) throw new Error(error);
		const normalized = normalizePollDraft(draft);
		await checkContent(
			ctx,
			member,
			[normalized.question, ...normalized.options].join("\n"),
		);
		const id = await ctx.db.insert("chatPolls", {
			...draft,
			question: draft.question.trim(),
			options: draft.options.map((option) => option.trim()),
			clubId: member.clubId,
			createdBy: member.userId,
			author: member.name,
			counts: normalized.options.map(() => 0),
			voterCount: 0,
		});
		const messageId = pollMessageId(id);
		const club = await ctx.db.get(member.clubId);
		await applyMessage(ctx, member, {
			type: "send-message",
			id: messageId,
			threadId: draft.threadId,
			body: normalized.question,
			time: pollMessageTime(Date.now(), club?.timeZone),
		});
		const anchor = await messageFor(ctx, member.clubId, messageId);
		if (
			!anchor ||
			anchor.value.accountId !== member.userId ||
			anchor.value.threadId !== draft.threadId ||
			anchor.value.deleted
		)
			throw new Error("Poll unavailable");
		await ctx.db.patch(anchor._id, { value: { ...anchor.value, pollId: id } });
		await ctx.db.patch(id, { messageId });
		if (draft.closesAt !== undefined)
			await ctx.scheduler.runAt(
				draft.closesAt,
				internal.thread_tools.closeExpired,
				{ pollId: id },
			);
		return id;
	},
});
export const closeExpired = internalMutation({
	args: { pollId: v.id("chatPolls") },
	handler: async (ctx, { pollId }): Promise<void> => {
		const poll = await ctx.db.get(pollId);
		if (
			poll &&
			!poll.closedAt &&
			poll.closesAt !== undefined &&
			poll.closesAt <= Date.now()
		)
			await ctx.db.patch(pollId, { closedAt: poll.closesAt });
	},
});
export const vote = mutation({
	args: { pollId: v.string(), choices: v.array(v.number()) },
	handler: async (ctx, { pollId: key, choices }): Promise<void> => {
		const member = await requireMember(ctx);
		const pollId = ctx.db.normalizeId("chatPolls", key);
		if (!pollId) throw new Error("Poll unavailable.");
		const poll = await ctx.db.get(pollId);
		if (!poll || poll.clubId !== member.clubId)
			throw new Error("Poll unavailable.");
		await requireChat(ctx, member, poll.threadId);
		if (!(await accessiblePoll(ctx, member, poll)))
			throw new Error("Poll unavailable.");
		const error = validateVote(poll, choices);
		if (error) throw new Error(error);
		const previous = await ctx.db
			.query("chatPollVotes")
			.withIndex("by_poll_user", (q) =>
				q.eq("pollId", pollId).eq("userId", member.userId),
			)
			.unique();
		const legacyVotes =
			poll.counts && poll.voterCount !== undefined
				? undefined
				: await ctx.db
						.query("chatPollVotes")
						.withIndex("by_poll", (q) => q.eq("pollId", pollId))
						.take(2001);
		if (legacyVotes && legacyVotes.length > 2000)
			throw new Error("Poll results need an update");
		const counts =
			poll.counts ??
			poll.options.map(
				(_, index) =>
					(legacyVotes ?? []).filter((vote) => vote.choices.includes(index))
						.length,
			);
		await ctx.db.patch(pollId, {
			counts: updatedPollCounts(counts, previous?.choices ?? [], choices),
			voterCount:
				(poll.voterCount ?? legacyVotes?.length ?? 0) + (previous ? 0 : 1),
		});
		if (previous) await ctx.db.patch(previous._id, { choices });
		else
			await ctx.db.insert("chatPollVotes", {
				clubId: member.clubId,
				pollId,
				userId: member.userId,
				choices,
			});
	},
});
export const close = mutation({
	args: { pollId: v.string() },
	handler: async (ctx, { pollId: key }): Promise<void> => {
		const member = await requireMember(ctx);
		const pollId = ctx.db.normalizeId("chatPolls", key);
		if (!pollId) throw new Error("Poll unavailable.");
		const poll = await ctx.db.get(pollId);
		if (!poll || poll.clubId !== member.clubId)
			throw new Error("Poll unavailable.");
		await requireChat(ctx, member, poll.threadId);
		if (!(await accessiblePoll(ctx, member, poll)))
			throw new Error("Poll unavailable");
		if (
			poll.createdBy !== member.userId &&
			!member.admin &&
			!member.coachPrograms.length
		)
			throw new Error("Only the author or club staff can close this poll.");
		if (!poll.closedAt) await ctx.db.patch(pollId, { closedAt: Date.now() });
	},
});
export const pin = mutation({
	args: { threadId: v.string(), messageId: v.string(), pinned: v.boolean() },
	handler: async (ctx, { threadId, messageId, pinned }): Promise<void> => {
		const member = await requireMember(ctx);
		await requireChat(ctx, member, threadId);
		if (!(await pinPermission(ctx, member, threadId)))
			throw new Error("Club staff manage pinned messages in this chat.");
		const message = await messageFor(ctx, member.clubId, messageId);
		if (
			!message ||
			message.value.threadId !== threadId ||
			message.value.deleted ||
			(await blockedIds(ctx, member.userId)).includes(message.value.accountId)
		)
			throw new Error("Message unavailable.");
		const existing = await ctx.db
			.query("chatPins")
			.withIndex("by_message", (q) =>
				q
					.eq("clubId", member.clubId)
					.eq("threadId", threadId)
					.eq("messageId", messageId),
			)
			.unique();
		if (!pinned && existing) await ctx.db.delete(existing._id);
		if (pinned && !existing) {
			const pins = await ctx.db
				.query("chatPins")
				.withIndex("by_thread", (q) =>
					q.eq("clubId", member.clubId).eq("threadId", threadId),
				)
				.take(3);
			if (pins.length >= 3)
				throw new Error(
					"Unpin a message before pinning another. Each conversation can have three pins.",
				);
			await ctx.db.insert("chatPins", {
				clubId: member.clubId,
				threadId,
				messageId,
				pinnedBy: member.userId,
			});
		}
	},
});
