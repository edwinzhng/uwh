"use node";

import { v } from "convex/values";
import { createLocalJWKSet, jwtVerify } from "jose";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const complete = action({
	args: { requestId: v.id("accountConnections"), token: v.string() },
	handler: async (ctx, { requestId, token }): Promise<void> => {
		if (token.length > 16000) throw new Error("Invalid sign-in proof.");
		const issuer = process.env.CONVEX_SITE_URL;
		if (!issuer) throw new Error("Account service unavailable.");
		const keys = createLocalJWKSet(JSON.parse(process.env.JWKS ?? "{}"));
		const { payload } = await jwtVerify(token, keys, {
			issuer,
			audience: "convex",
			algorithms: ["RS256"],
			maxTokenAge: "10m",
		});
		const [proofUser, proofSession, extra] = payload.sub?.split("|") ?? [];
		if (!proofUser || !proofSession || extra)
			throw new Error("Invalid sign-in proof.");
		await ctx.runMutation(internal.connected_accounts.finish, {
			requestId,
			proofUser,
			proofSession,
		});
	},
});
