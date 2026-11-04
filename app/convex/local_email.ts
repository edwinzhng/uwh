import { v } from "convex/values";
import { localAccountSwitchAllowed } from "../src/domain/local-account-tools";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

export const save = internalMutation({
	args: { email: v.string(), purpose: v.string(), code: v.string() },
	handler: async (ctx, args): Promise<void> => {
		requireLocalEmail(args.email);
		const id = await ctx.db.insert("localEmails", {
			...args,
			expiresAt: Date.now() + 600000,
		});
		await ctx.scheduler.runAfter(600000, internal.local_email.expire, { id });
	},
});
export const latest = internalQuery({
	args: { email: v.string() },
	handler: async (ctx, { email }): Promise<string | null> => {
		requireLocalEmail(email);
		const mail = await ctx.db
			.query("localEmails")
			.withIndex("by_email", (q) => q.eq("email", email))
			.order("desc")
			.first();
		return mail && mail.expiresAt > Date.now() ? mail.code : null;
	},
});
export const expire = internalMutation({
	args: { id: v.id("localEmails") },
	handler: async (ctx, { id }): Promise<void> => {
		if (await ctx.db.get(id)) await ctx.db.delete(id);
	},
});

export const prepareAccountSwitch = internalMutation({
	args: { email: v.string() },
	handler: async (ctx, { email }): Promise<void> => {
		requireLocalEmail(email);
		if (
			!localAccountSwitchAllowed({
				enabled: process.env.LOCAL_ACCOUNT_SWITCH_ENABLED,
				backendUrl: process.env.CONVEX_CLOUD_URL,
				outboundDisabled: process.env.OUTBOUND_DELIVERY_DISABLED,
				emailMode: process.env.AUTH_EMAIL_MODE,
			})
		)
			throw new Error("Local account switching is disabled.");
		const users = await ctx.db
			.query("users")
			.withIndex("email", (query) => query.eq("email", email))
			.take(2);
		if (users.length !== 1 || !users.at(0)?.emailVerificationTime)
			throw new Error("Choose a copied verified account.");
		for (const row of await ctx.db
			.query("mailLimits")
			.withIndex("by_email", (query) => query.eq("email", email))
			.collect())
			await ctx.db.delete(row._id);
	},
});
