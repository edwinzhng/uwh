import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";

export const rememberAppleGrant = async (
	ctx: MutationCtx,
	userId: Id<"users">,
	subject: string,
	encryptedToken: string,
): Promise<void> => {
	const existing = await ctx.db
		.query("appleGrants")
		.withIndex("by_subject", (q) => q.eq("subject", subject))
		.unique();
	if (existing?.pending)
		throw new Error(
			"Account deletion is finishing. Try signing in again shortly.",
		);
	if (existing && existing.userId !== userId)
		throw new Error(
			"This Apple account is already connected to another account.",
		);
	const value = {
		userId,
		subject,
		encryptedToken,
		pending: false,
		attempts: 0,
		nextAttemptAt: 0,
		authorizedAt: Date.now(),
	};
	if (existing) await ctx.db.patch(existing._id, value);
	else await ctx.db.insert("appleGrants", value);
};

export const appleVerificationRequired = async (
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<boolean> => {
	const accounts = await ctx.db
		.query("authAccounts")
		.withIndex("userIdAndProvider", (q) =>
			q.eq("userId", userId).eq("provider", "apple"),
		)
		.collect();
	const grants = await ctx.db
		.query("appleGrants")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect();
	return accounts.some(
		(account) =>
			!grants.some(
				(grant) =>
					!grant.pending && grant.subject === account.providerAccountId,
			),
	);
};

export const queueAppleRevocation = async (
	ctx: MutationCtx,
	userId: Id<"users">,
	subject?: string,
): Promise<void> => {
	for (const grant of await ctx.db
		.query("appleGrants")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect()) {
		if (subject && grant.subject !== subject) continue;
		await ctx.db.patch(grant._id, {
			userId: undefined,
			pending: true,
			nextAttemptAt: Date.now(),
		});
		await ctx.scheduler.runAfter(0, internal.apple_revocation.revoke, {
			id: grant._id,
		});
	}
};

export const pendingGrant = internalQuery({
	args: { id: v.id("appleGrants") },
	handler: async (ctx, { id }): Promise<Doc<"appleGrants"> | null> => {
		const grant = await ctx.db.get(id);
		return grant?.pending ? grant : null;
	},
});

export const claim = internalMutation({
	args: { id: v.id("appleGrants") },
	handler: async (ctx, { id }): Promise<Doc<"appleGrants"> | null> => {
		const grant = await ctx.db.get(id);
		if (!grant?.pending || grant.nextAttemptAt > Date.now()) return null;
		await ctx.db.patch(id, { nextAttemptAt: Date.now() + 60000 });
		return grant;
	},
});

export const complete = internalMutation({
	args: { id: v.id("appleGrants") },
	handler: async (ctx, { id }): Promise<void> => {
		const grant = await ctx.db.get(id);
		if (grant?.pending) await ctx.db.delete(id);
	},
});

export const retry = internalMutation({
	args: { id: v.id("appleGrants") },
	handler: async (ctx, { id }): Promise<void> => {
		const grant = await ctx.db.get(id);
		if (!grant?.pending) return;
		const attempts = grant.attempts + 1;
		const delay = Math.min(3600000, 30000 * 2 ** Math.min(attempts, 7));
		await ctx.db.patch(id, { attempts, nextAttemptAt: Date.now() + delay });
		await ctx.scheduler.runAfter(delay, internal.apple_revocation.revoke, {
			id,
		});
	},
});

export const retryPending = internalMutation({
	args: {},
	handler: async (ctx): Promise<void> => {
		for (const grant of await ctx.db
			.query("appleGrants")
			.withIndex("by_pending_attempt", (q) =>
				q.eq("pending", true).lte("nextAttemptAt", Date.now()),
			)
			.take(50))
			await ctx.scheduler.runAfter(0, internal.apple_revocation.revoke, {
				id: grant._id,
			});
	},
});
