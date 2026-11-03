import { updatedPollCounts } from "../src/domain/chat-polls";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseThreadTools = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	userId: Id<"users">,
	removeClub: boolean,
): Promise<void> => {
	const polls = await ctx.db
		.query("chatPolls")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect();
	const removedPolls = polls.filter(
		(poll) => removeClub || poll.createdBy === userId,
	);
	const removedIds = new Set(removedPolls.map((poll) => poll._id));
	for (const vote of await ctx.db
		.query("chatPollVotes")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect()) {
		if (removeClub || vote.userId === userId || removedIds.has(vote.pollId))
			await ctx.db.delete(vote._id);
		if (!removeClub && vote.userId === userId && !removedIds.has(vote.pollId)) {
			const poll = polls.find((poll) => poll._id === vote.pollId);
			if (poll?.counts && poll.voterCount !== undefined)
				await ctx.db.patch(poll._id, {
					counts: updatedPollCounts(poll.counts, vote.choices, []),
					voterCount: Math.max(0, poll.voterCount - 1),
				});
		}
	}
	for (const poll of removedPolls) await ctx.db.delete(poll._id);
	for (const pin of await ctx.db
		.query("chatPins")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect()) {
		if (removeClub || pin.pinnedBy === userId) await ctx.db.delete(pin._id);
	}
};
