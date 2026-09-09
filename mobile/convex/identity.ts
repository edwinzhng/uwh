import {
	getAuthSessionId,
	getAuthUserId as tokenUserId,
} from "@convex-dev/auth/server";
import type { Account } from "../src/domain/app-types";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type ActionCtx,
	internalQuery,
	type QueryCtx,
} from "./_generated/server";

export const getAuthUserId = async (
	ctx: QueryCtx,
): Promise<Id<"users"> | null> => {
	const userId = await tokenUserId(ctx);
	const sessionId = await getAuthSessionId(ctx);
	if (!userId || !sessionId) return null;
	const [user, session] = await Promise.all([
		ctx.db.get(userId),
		ctx.db.get(sessionId),
	]);
	return user?.emailVerificationTime &&
		session?.userId === userId &&
		session.expirationTime > Date.now()
		? userId
		: null;
};
export const current = internalQuery({
	args: {},
	handler: async (ctx): Promise<Id<"users"> | null> => getAuthUserId(ctx),
});
export const actionUserId = (ctx: ActionCtx): Promise<Id<"users"> | null> =>
	ctx.runQuery(internal.identity.current, {});
export const memberFor = async (
	ctx: QueryCtx,
): Promise<Doc<"memberships"> | undefined> => {
	const userId = await getAuthUserId(ctx);
	const membership = userId
		? await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.first()
		: undefined;
	return membership ?? undefined;
};
export const requireMember = async (
	ctx: QueryCtx,
): Promise<Doc<"memberships">> => {
	const member = await memberFor(ctx);
	if (!member) throw new Error("Sign in and join a club first.");
	return member;
};

export const accountFor = (membership: Doc<"memberships">): Account => ({
	id: membership.userId,
	name: membership.name,
	personId: membership.personId,
	children: membership.children,
	coachPrograms: membership.coachPrograms,
	admin: membership.admin,
});
