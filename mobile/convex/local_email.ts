import { v } from "convex/values";
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
