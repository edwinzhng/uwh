import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseDevelopment = async (
	ctx: MutationCtx,
	input: {
		clubId: Id<"clubs">;
		userId: Id<"users">;
		removeClub: boolean;
		personIds?: string[];
	},
): Promise<void> => {
	const personIds = new Set(input.personIds ?? []);
	const policy = await ctx.db
		.query("developmentPolicies")
		.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
		.unique();
	if (policy) {
		if (input.removeClub) await ctx.db.delete(policy._id);
		else if (policy.reviewerIds.includes(input.userId))
			await ctx.db.patch(policy._id, {
				reviewerIds: policy.reviewerIds.filter((id) => id !== input.userId),
				revision: policy.revision + 1,
			});
	}
	const [rounds, reviews, reflections] = await Promise.all([
		ctx.db
			.query("developmentRounds")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.collect(),
		ctx.db
			.query("developmentReviews")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.collect(),
		ctx.db
			.query("goalReflections")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.collect(),
	]);
	for (const round of rounds) {
		if (input.removeClub || personIds.has(round.personId))
			await ctx.db.delete(round._id);
		else if (round.requiredCoachIds.includes(input.userId))
			await ctx.db.patch(round._id, {
				requiredCoachIds: round.requiredCoachIds.filter(
					(id) => id !== input.userId,
				),
				revision: round.revision + 1,
				updatedAt: Date.now(),
			});
	}
	for (const review of reviews) {
		if (
			input.removeClub ||
			personIds.has(review.personId) ||
			review.coachId === input.userId
		)
			await ctx.db.delete(review._id);
	}
	for (const reflection of reflections) {
		if (
			input.removeClub ||
			personIds.has(reflection.personId) ||
			reflection.authorId === input.userId
		)
			await ctx.db.delete(reflection._id);
	}
};
