"use node";

import { retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";

export const deleteAccount = action({
	args: {
		password: v.optional(v.string()),
		transferTo: v.optional(v.id("users")),
	},
	handler: async (ctx, { password, transferTo }): Promise<void> => {
		const user = await ctx.runQuery(api.account.current, {});
		if (!user) throw new Error("Sign in again to delete your account.");
		if (password) {
			const account = await retrieveAccount(ctx, {
				provider: "password",
				account: { id: user.email.trim().toLowerCase(), secret: password },
			});
			if (account.user._id !== user.id) throw new Error("Check your password.");
		}
		await ctx.runMutation(internal.account.remove, {
			userId: user.id,
			requireVerification: !password,
			transferTo,
		});
	},
});
