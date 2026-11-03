import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseTerms = async (
	ctx: MutationCtx,
	input: { userId: Id<"users">; clubId?: Id<"clubs">; removeClub: boolean },
): Promise<void> => {
	const clubId = input.clubId;
	const acceptances =
		input.removeClub && clubId
			? await ctx.db
					.query("termsAcceptances")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect()
			: await ctx.db
					.query("termsAcceptances")
					.withIndex("by_user", (q) => q.eq("userId", input.userId))
					.collect();
	for (const row of acceptances) await ctx.db.delete(row._id);
	if (!clubId) return;
	for (const row of await ctx.db
		.query("termsVersions")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect()) {
		if (input.removeClub) await ctx.db.delete(row._id);
		else if (row.actorId === input.userId)
			await ctx.db.patch(row._id, { actorId: undefined });
	}
	if (input.removeClub)
		for (const row of await ctx.db
			.query("termsSettings")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect())
			await ctx.db.delete(row._id);
};
