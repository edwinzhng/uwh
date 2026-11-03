import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseWebPush = async (
	ctx: MutationCtx,
	input: { userId: Id<"users">; clubId?: Id<"clubs">; removeClub: boolean },
): Promise<void> => {
	const clubId = input.clubId;
	for (const table of ["webPushSubscriptions", "webPushDeliveries"] as const) {
		const rows = await (input.removeClub && clubId
			? ctx.db.query(table).withIndex("by_club", (q) => q.eq("clubId", clubId))
			: ctx.db
					.query(table)
					.withIndex("by_user", (q) => q.eq("userId", input.userId))
		).collect();
		for (const row of rows) await ctx.db.delete(row._id);
	}
	for (const row of await ctx.db
		.query("notificationTests")
		.withIndex("by_user", (q) => q.eq("userId", input.userId))
		.collect())
		await ctx.db.delete(row._id);
};
