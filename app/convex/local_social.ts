import { v } from "convex/values";
import { importPKCS8, SignJWT } from "jose";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation } from "./_generated/server";
import { eraseAccount } from "./account_erasure";
import { requireLocalEmail } from "./auth_mail";
import { saveAuthUser } from "./auth_users";
import { connectionPurpose, socialProvider } from "./connection_schema";

export const provision = internalMutation({
	args: {
		email: v.string(),
		provider: socialProvider,
		subject: v.string(),
		verified: v.boolean(),
		name: v.string(),
	},
	handler: async (
		ctx,
		{ email, provider, subject, verified, name },
	): Promise<Id<"users">> => {
		requireLocalEmail(email);
		const existing = await ctx.db
			.query("authAccounts")
			.withIndex("providerAndAccountId", (q) =>
				q.eq("provider", provider).eq("providerAccountId", subject),
			)
			.unique();
		const userId = await saveAuthUser(ctx, {
			existingUserId: existing?.userId ?? null,
			type: "oauth",
			profile: { email, emailVerified: verified, name },
		});
		if (!existing)
			await ctx.db.insert("authAccounts", {
				userId,
				provider,
				providerAccountId: subject,
				emailVerified: email,
			});
		return userId;
	},
});

export const request = internalMutation({
	args: {
		userId: v.id("users"),
		sessionId: v.id("authSessions"),
		provider: socialProvider,
		purpose: connectionPurpose,
		expired: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ userId, sessionId, provider, purpose, expired },
	): Promise<Id<"accountConnections">> => {
		const user = await ctx.db.get(userId);
		requireLocalEmail(user?.email ?? "");
		if ((await ctx.db.get(sessionId))?.userId !== userId)
			throw new Error("Wrong test session.");
		return ctx.db.insert("accountConnections", {
			userId,
			sessionId,
			provider,
			purpose,
			state: "pending",
			expiresAt: Date.now() + (expired ? -1 : 600000),
		});
	},
});

export const session = internalAction({
	args: { userId: v.id("users"), email: v.string() },
	handler: async (
		ctx,
		{ userId, email },
	): Promise<{ token: string; sessionId: Id<"authSessions"> }> => {
		requireLocalEmail(email);
		const sessionId = await ctx.runMutation(internal.local_social.checkUser, {
			userId,
			email,
		});
		const key = await importPKCS8(process.env.JWT_PRIVATE_KEY ?? "", "RS256");
		const token = await new SignJWT({ sub: `${userId}|${sessionId}` })
			.setProtectedHeader({ alg: "RS256" })
			.setIssuedAt()
			.setIssuer(process.env.CONVEX_SITE_URL ?? "")
			.setAudience("convex")
			.setExpirationTime("1h")
			.sign(key);
		return { token, sessionId };
	},
});

export const checkUser = internalMutation({
	args: { userId: v.id("users"), email: v.string() },
	handler: async (ctx, { userId, email }): Promise<Id<"authSessions">> => {
		requireLocalEmail(email);
		if ((await ctx.db.get(userId))?.email !== email)
			throw new Error("Wrong test user.");
		return ctx.db.insert("authSessions", {
			userId,
			expirationTime: Date.now() + 3600000,
		});
	},
});

export const remove = internalMutation({
	args: { userId: v.id("users"), email: v.string() },
	handler: async (ctx, { userId, email }): Promise<void> => {
		requireLocalEmail(email);
		const user = await ctx.db.get(userId);
		if (!user) return;
		if (user.email !== email) throw new Error("Wrong test user.");
		await eraseAccount(ctx, userId);
	},
});
