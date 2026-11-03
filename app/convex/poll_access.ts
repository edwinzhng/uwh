import { type ChatPoll, summarizePollCounts } from "../src/domain/chat-polls";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { messageFor, threadFor } from "./message_access";
import { blockedIds } from "./moderation";

export const pollAnchorAvailable = async (
	ctx: QueryCtx,
	poll: Doc<"chatPolls">,
): Promise<boolean> => {
	if (!poll.messageId) return true;
	const message = await messageFor(ctx, poll.clubId, poll.messageId);
	return Boolean(
		message &&
			!message.value.deleted &&
			message.value.pollId === poll._id &&
			message.value.threadId === poll.threadId,
	);
};
export const accessiblePoll = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
	poll: Doc<"chatPolls">,
): Promise<boolean> => {
	if (poll.clubId !== member.clubId) return false;
	const [thread, blocked, available] = await Promise.all([
		threadFor(ctx, member.clubId, poll.threadId),
		blockedIds(ctx, member.userId),
		pollAnchorAvailable(ctx, poll),
	]);
	return Boolean(
		thread?.value.accountIds.includes(member.userId) &&
			!blocked.includes(poll.createdBy) &&
			available,
	);
};
export const pollSummary = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
	poll: Doc<"chatPolls">,
): Promise<ChatPoll> => {
	const own = await ctx.db
		.query("chatPollVotes")
		.withIndex("by_poll_user", (q) =>
			q.eq("pollId", poll._id).eq("userId", member.userId),
		)
		.unique();
	const votes =
		poll.counts && poll.voterCount !== undefined
			? undefined
			: await ctx.db
					.query("chatPollVotes")
					.withIndex("by_poll", (q) => q.eq("pollId", poll._id))
					.take(251);
	if (votes && votes.length > 250)
		throw new Error("Poll results need an update");
	return summarizePollCounts(
		{ ...poll, id: poll._id },
		member.userId,
		member.admin || member.coachPrograms.length > 0,
		own?.choices ?? [],
		poll.counts ??
			poll.options.map(
				(_, index) =>
					(votes ?? []).filter((vote) => vote.choices.includes(index)).length,
			),
		poll.voterCount ?? votes?.length ?? 0,
	);
};
