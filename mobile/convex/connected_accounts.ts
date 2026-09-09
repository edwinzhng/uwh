import { getAuthSessionId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { isSocialProvider } from "../src/domain/social-auth";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { removeAuthSession } from "./auth_sessions";
import { connectionPurpose, socialProvider } from "./connection_schema";
import { getAuthUserId } from "./identity";
import { socialEnabled } from "./social_config";

type ConnectedAccountsInfo = {
	google: boolean;
	apple: boolean;
	reauthenticated: boolean;
	verificationExpiresAt: number;
	accounts: {
		id: Id<"authAccounts">;
		provider: string;
		email: string;
		canDisconnect: boolean;
	}[];
};

const verificationExpiration = async (ctx: QueryCtx): Promise<number> => {
	const sessionId = await getAuthSessionId(ctx);
	if (!sessionId) return 0;
	const requests = await ctx.db
		.query("accountConnections")
		.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
		.collect();
	return requests
		.filter(
			(request) => request.purpose === "verify" && request.state === "complete",
		)
		.reduce((latest, request) => Math.max(latest, request.expiresAt), 0);
};

export const recentVerification = async (ctx: QueryCtx): Promise<boolean> =>
	(await verificationExpiration(ctx)) > Date.now();

const usable = (account: Doc<"authAccounts">): boolean =>
	account.provider === "password"
		? Boolean(account.secret && account.emailVerified)
		: isSocialProvider(account.provider) && socialEnabled(account.provider);

export const list = query({
	args: {},
	handler: async (ctx): Promise<ConnectedAccountsInfo> => {
		const userId = await getAuthUserId(ctx);
		const accounts = userId
			? await ctx.db
					.query("authAccounts")
					.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
					.collect()
			: [];
		const verificationExpiresAt = userId
			? await verificationExpiration(ctx)
			: 0;
		return {
			google: socialEnabled("google"),
			apple: socialEnabled("apple"),
			reauthenticated: verificationExpiresAt > Date.now(),
			verificationExpiresAt,
			accounts: accounts
				.filter(
					(account) =>
						account.provider === "password" ||
						isSocialProvider(account.provider),
				)
				.map((account) => ({
					id: account._id,
					provider: account.provider,
					email:
						account.emailVerified ??
						(account.provider === "password" ? account.providerAccountId : ""),
					canDisconnect:
						account.provider !== "password" &&
						accounts.some(
							(other) => other._id !== account._id && usable(other),
						),
				})),
		};
	},
});

export const result = query({
	args: { requestId: v.string() },
	handler: async (
		ctx,
		{ requestId },
	): Promise<{ purpose: "link" | "verify"; complete: boolean } | null> => {
		const id = ctx.db.normalizeId("accountConnections", requestId);
		const request = id ? await ctx.db.get(id) : undefined;
		if (
			!request ||
			request.userId !== (await getAuthUserId(ctx)) ||
			request.sessionId !== (await getAuthSessionId(ctx)) ||
			request.expiresAt <= Date.now()
		)
			return null;
		return { purpose: request.purpose, complete: request.state === "complete" };
	},
});

export const begin = mutation({
	args: { provider: socialProvider, purpose: connectionPurpose },
	handler: async (
		ctx,
		{ provider, purpose },
	): Promise<Id<"accountConnections">> => {
		const userId = await getAuthUserId(ctx);
		const sessionId = await getAuthSessionId(ctx);
		if (!userId || !sessionId) throw new Error("Sign in first.");
		if (!socialEnabled(provider))
			throw new Error("This sign-in provider isn’t configured yet.");
		const previous = await ctx.db
			.query("accountConnections")
			.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
			.order("desc")
			.first();
		if (previous && previous._creationTime > Date.now() - 10000)
			throw new Error("Wait a few seconds before trying again.");
		return ctx.db.insert("accountConnections", {
			userId,
			sessionId,
			provider,
			purpose,
			state: "pending",
			expiresAt: Date.now() + 10 * 60000,
		});
	},
});

export const cancel = mutation({
	args: { requestId: v.id("accountConnections") },
	handler: async (ctx, { requestId }): Promise<void> => {
		const request = await ctx.db.get(requestId);
		if (
			request?.userId !== (await getAuthUserId(ctx)) ||
			request?.sessionId !== (await getAuthSessionId(ctx))
		)
			throw new Error("Connection unavailable.");
		await ctx.db.delete(requestId);
	},
});

export const finish = internalMutation({
	args: {
		requestId: v.id("accountConnections"),
		proofUser: v.string(),
		proofSession: v.string(),
	},
	handler: async (
		ctx,
		{ requestId, proofUser, proofSession },
	): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		const sessionId = await getAuthSessionId(ctx);
		const request = await ctx.db.get(requestId);
		if (
			!userId ||
			!sessionId ||
			request?.userId !== userId ||
			request.sessionId !== sessionId ||
			request.expiresAt <= Date.now()
		)
			throw new Error("Connection expired. Start again from Settings.");
		if (request.state === "complete") return;
		const sourceId = ctx.db.normalizeId("users", proofUser);
		const proofId = ctx.db.normalizeId("authSessions", proofSession);
		const proof = proofId ? await ctx.db.get(proofId) : undefined;
		const source = sourceId ? await ctx.db.get(sourceId) : undefined;
		if (
			!sourceId ||
			!source?.emailVerificationTime ||
			!proofId ||
			proof?.userId !== sourceId ||
			proof.expirationTime <= Date.now() ||
			proof._creationTime < request._creationTime ||
			proofId === sessionId
		)
			throw new Error("Verify your sign-in provider again.");
		const accounts = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) => q.eq("userId", sourceId))
			.collect();
		const providerAccount = accounts.find(
			(account) => account.provider === request.provider,
		);
		if (!providerAccount) throw new Error("Use the provider you selected.");
		if (request.purpose === "verify" && sourceId !== userId)
			throw new Error(
				"Choose the provider account already connected to your profile.",
			);
		if (sourceId !== userId) {
			const existing = await ctx.db
				.query("authAccounts")
				.withIndex("userIdAndProvider", (q) =>
					q.eq("userId", userId).eq("provider", request.provider),
				)
				.first();
			if (existing)
				throw new Error("Disconnect your current provider account first.");
			const membership = await ctx.db
				.query("memberships")
				.withIndex("by_user", (q) => q.eq("userId", sourceId))
				.first();
			const joinRequest = await ctx.db
				.query("joinRequests")
				.withIndex("by_user", (q) => q.eq("userId", sourceId))
				.first();
			if (membership || joinRequest || accounts.length !== 1)
				throw new Error(
					"This sign-in belongs to another club account. Accounts with club records can’t be merged here.",
				);
			await ctx.db.patch(providerAccount._id, { userId });
			for (const code of await ctx.db
				.query("authVerificationCodes")
				.withIndex("accountId", (q) => q.eq("accountId", providerAccount._id))
				.collect())
				await ctx.db.delete(code._id);
			for (const session of await ctx.db
				.query("authSessions")
				.withIndex("userId", (q) => q.eq("userId", sourceId))
				.collect())
				await removeAuthSession(ctx, session._id);
			for (const connection of await ctx.db
				.query("accountConnections")
				.withIndex("by_user", (q) => q.eq("userId", sourceId))
				.collect())
				await ctx.db.delete(connection._id);
			await ctx.db.delete(sourceId);
		} else await removeAuthSession(ctx, proofId);
		await ctx.db.patch(requestId, {
			state: "complete",
			expiresAt: Date.now() + 5 * 60000,
		});
	},
});

export const disconnect = mutation({
	args: { accountId: v.id("authAccounts") },
	handler: async (ctx, { accountId }): Promise<void> => {
		const userId = await getAuthUserId(ctx);
		const sessionId = await getAuthSessionId(ctx);
		const account = await ctx.db.get(accountId);
		if (
			!userId ||
			account?.userId !== userId ||
			!isSocialProvider(account.provider)
		)
			throw new Error("Connected account unavailable.");
		const accounts = await ctx.db
			.query("authAccounts")
			.withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
			.collect();
		if (!accounts.some((other) => other._id !== accountId && usable(other)))
			throw new Error("Keep at least one working sign-in method.");
		for (const code of await ctx.db
			.query("authVerificationCodes")
			.withIndex("accountId", (q) => q.eq("accountId", accountId))
			.collect())
			await ctx.db.delete(code._id);
		await ctx.db.delete(accountId);
		for (const session of await ctx.db
			.query("authSessions")
			.withIndex("userId", (q) => q.eq("userId", userId))
			.collect())
			if (session._id !== sessionId) await removeAuthSession(ctx, session._id);
	},
});
