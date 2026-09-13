import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { threadFor } from "./message_access";

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
	const thread = await threadFor(ctx, membership.clubId, threadId);
	return thread?.value.accountIds.includes(userId) ? membership : undefined;
};
