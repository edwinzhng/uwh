"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { decryptAppleToken } from "./apple_token_crypto";

export const revokeAppleToken = async (
	token: string,
	clientId: string,
	clientSecret: string,
	transport: (url: string, options: RequestInit) => Promise<Response> = fetch,
): Promise<void> => {
	if (!clientId || !clientSecret || !token)
		throw new Error("Apple authorization revocation is not configured.");
	const response = await transport("https://appleid.apple.com/auth/revoke", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			token,
			token_type_hint: "refresh_token",
		}),
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok)
		throw new Error("Apple authorization revocation needs a retry.");
};

export const revoke = internalAction({
	args: { id: v.id("appleGrants") },
	handler: async (ctx, { id }): Promise<void> => {
		const grant = await ctx.runMutation(internal.apple_grants.claim, {
			id,
		});
		if (!grant) return;
		try {
			if (process.env.OUTBOUND_DELIVERY_DISABLED === "true")
				throw new Error("External authorization revocation is disabled.");
			await revokeAppleToken(
				await decryptAppleToken(grant.encryptedToken),
				process.env.AUTH_APPLE_ID ?? "",
				process.env.AUTH_APPLE_SECRET ?? "",
			);
			await ctx.runMutation(internal.apple_grants.complete, { id });
		} catch {
			console.error("Apple authorization revocation requires a retry", id);
			await ctx.runMutation(internal.apple_grants.retry, { id });
		}
	},
});
