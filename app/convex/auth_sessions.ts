import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const removeAuthSession = async (
	ctx: MutationCtx,
	sessionId: Id<"authSessions">,
): Promise<void> => {
	for (const token of await ctx.db
		.query("authRefreshTokens")
		.withIndex("sessionId", (q) => q.eq("sessionId", sessionId))
		.collect())
		await ctx.db.delete(token._id);
	if (await ctx.db.get(sessionId)) await ctx.db.delete(sessionId);
};
