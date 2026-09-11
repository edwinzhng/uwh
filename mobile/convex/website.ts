import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const authorize = (key: string): void => {
	if (!process.env.WEBSITE_SERVER_KEY || key !== process.env.WEBSITE_SERVER_KEY)
		throw new Error("Unauthorized");
};
export const content = query({
	args: {},
	handler: async (ctx): Promise<string | undefined> =>
		(await ctx.db.query("websiteContent").first())?.json,
});
export const saveContent = mutation({
	args: { key: v.string(), json: v.string() },
	handler: async (ctx, args): Promise<void> => {
		authorize(args.key);
		if (args.json.length > 100000) throw new Error("Content too large");
		const current = await ctx.db.query("websiteContent").first();
		if (current) await ctx.db.patch(current._id, { json: args.json });
		else await ctx.db.insert("websiteContent", { json: args.json });
	},
});
export const submit = mutation({
	args: {
		phone: v.optional(v.string()),
		gender: v.optional(v.string()),
		firstSessionDate: v.optional(v.string()),
		referral: v.optional(v.string()),
		referralOther: v.optional(v.string()),
		key: v.string(),
		name: v.string(),
		email: v.string(),
		interest: v.string(),
		message: v.string(),
		fingerprint: v.string(),
	},
	handler: async (ctx, args): Promise<void> => {
		authorize(args.key);
		const recent = await ctx.db
			.query("websiteEnquiries")
			.withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
			.order("desc")
			.take(5);
		if (
			recent.filter((row) => row._creationTime > Date.now() - 3600000).length >=
			3
		)
			throw new Error("Please wait before sending another inquiry.");
		const duplicates = await ctx.db
			.query("websiteEnquiries")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.order("desc")
			.take(1);
		if (duplicates.some((row) => row._creationTime > Date.now() - 60000))
			throw new Error("Your inquiry was already received.");
		await ctx.db.insert("websiteEnquiries", {
			name: args.name,
			email: args.email,
			interest: args.interest,
			message: args.message,
			phone: args.phone,
			gender: args.gender,
			firstSessionDate: args.firstSessionDate,
			referral: args.referral,
			referralOther: args.referralOther,
			fingerprint: args.fingerprint,
		});
	},
});
export const enquiries = query({
	args: { key: v.string() },
	handler: async (ctx, args) => {
		authorize(args.key);
		return await ctx.db.query("websiteEnquiries").order("desc").take(100);
	},
});

export const checkLogin = mutation({
	args: { key: v.string(), fingerprint: v.string() },
	handler: async (ctx, args): Promise<boolean> => {
		authorize(args.key);
		const recent = await ctx.db
			.query("websiteLoginAttempts")
			.withIndex("by_fingerprint", (q) => q.eq("fingerprint", args.fingerprint))
			.order("desc")
			.take(10);
		if (
			recent.filter((r) => r._creationTime > Date.now() - 900000).length >= 10
		)
			return false;
		await ctx.db.insert("websiteLoginAttempts", {
			fingerprint: args.fingerprint,
		});
		return true;
	},
});
