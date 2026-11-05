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
		if (removeClub || row.clubId === clubId) {
			for (const file of await ctx.db
				.query("resourceFiles")
				.withIndex("by_club", (q) => q.eq("clubId", row.clubId))
				.filter((q) => q.eq(q.field("sessionPlanKey"), row.key))
				.collect()) {
				await ctx.storage.delete(file.storageId);
				await ctx.db.delete(file._id);
			}
			await ctx.db.delete(row._id);
		}
	}
};
