import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseSessionPlans = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	userId: Id<"users">,
	removeClub: boolean,
): Promise<void> => {
	const requests = await (removeClub
		? ctx.db
				.query("sessionPlanRequests")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
		: ctx.db
				.query("sessionPlanRequests")
				.withIndex("by_actor", (q) => q.eq("actorId", userId))
	).collect();
	for (const request of requests)
		if (request.clubId === clubId) await ctx.db.delete(request._id);
	const rows = await (removeClub
		? ctx.db
				.query("sessionPlans")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
		: ctx.db
				.query("sessionPlans")
				.withIndex("by_author", (q) => q.eq("updatedBy", userId))
	).collect();
	for (const row of rows) {
		if (removeClub) await ctx.db.delete(row._id);
		else if (row.clubId === clubId)
			await ctx.db.patch(row._id, { updatedBy: undefined });
	}
};
