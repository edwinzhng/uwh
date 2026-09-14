import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getSettings = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("settings").collect();
	},
});

export const getSettingByKey = query({
	args: { key: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("settings")
			.withIndex("by_key", (q) => q.eq("key", args.key))
			.unique();
	},
});

export const setSetting = mutation({
	args: {
		key: v.string(),
		value: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("settings")
			.withIndex("by_key", (q) => q.eq("key", args.key))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				value: args.value,
				updatedAt: Date.now(),
			});
			return await ctx.db.get(existing._id);
		} else {
			const id = await ctx.db.insert("settings", {
				key: args.key,
				value: args.value,
				updatedAt: Date.now(),
			});
			return await ctx.db.get(id);
		}
	},
});
