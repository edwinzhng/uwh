import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseSessionCheckins = async (
	ctx: MutationCtx,
	input: {
		clubId: Id<"clubs">;
		userId: Id<"users">;
		removeClub: boolean;
		personIds?: string[];
	},
): Promise<void> => {
	const rows = input.removeClub
		? await ctx.db
				.query("sessionCheckins")
				.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
				.collect()
		: (
				await Promise.all([
					ctx.db
						.query("sessionCheckins")
						.withIndex("by_actor", (q) => q.eq("actorId", input.userId))
						.collect(),
					...[...new Set(input.personIds ?? [])].map((personId) =>
						ctx.db
							.query("sessionCheckins")
							.withIndex("by_person", (q) =>
								q.eq("clubId", input.clubId).eq("personId", personId),
							)
							.collect(),
					),
				])
			).flat();
	for (const row of new Map(rows.map((entry) => [entry._id, entry])).values())
		await ctx.db.delete(row._id);
};
