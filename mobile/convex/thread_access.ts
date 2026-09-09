import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const threadMembership = async (
	ctx: QueryCtx,
	userId: Id<"users">,
	threadId: string,
): Promise<Doc<"memberships"> | undefined> => {
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first();
	if (!membership) return undefined;
	const thread = await ctx.db
		.query("conversations")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", membership.clubId).eq("value.id", threadId),
		)
		.unique();
	return thread?.value.accountIds.includes(userId) ? membership : undefined;
};
