import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseInbox = async (
	ctx: MutationCtx,
	input: { userId: Id<"users">; clubId?: Id<"clubs">; removeClub: boolean },
): Promise<void> => {
	const clubId = input.clubId;
	const rows = await (input.removeClub && clubId
		? ctx.db
				.query("inboxItems")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
		: ctx.db
				.query("inboxItems")
				.withIndex("by_user", (q) => q.eq("userId", input.userId))
	).collect();
	for (const row of rows) await ctx.db.delete(row._id);
};
