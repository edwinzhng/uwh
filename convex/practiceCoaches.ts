import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const addCoachToPractice = mutation({
	args: {
		practiceId: v.id("practices"),
		coachId: v.id("coaches"),
		durationMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("practiceCoaches")
			.withIndex("by_practiceId_and_coachId", (q) =>
				q.eq("practiceId", args.practiceId).eq("coachId", args.coachId),
			)
			.unique();

		if (existing) {
			throw new Error("Coach already assigned to this practice");
		}

		return await ctx.db.insert("practiceCoaches", {
			practiceId: args.practiceId,
			coachId: args.coachId,
			durationMinutes: args.durationMinutes ?? 90,
		});
	},
});

export const removeCoachFromPractice = mutation({
	args: {
		practiceId: v.id("practices"),
		coachId: v.id("coaches"),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("practiceCoaches")
			.withIndex("by_practiceId_and_coachId", (q) =>
				q.eq("practiceId", args.practiceId).eq("coachId", args.coachId),
			)
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
		return { success: true };
	},
});

export const setPracticeCoaches = mutation({
	args: {
		practiceId: v.id("practices"),
		coachIds: v.array(v.id("coaches")),
		durationMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Remove existing
		const existing = await ctx.db
			.query("practiceCoaches")
			.withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
			.collect();

		for (const pc of existing) {
			await ctx.db.delete(pc._id);
		}

		// Add new ones
		for (const coachId of args.coachIds) {
			await ctx.db.insert("practiceCoaches", {
				practiceId: args.practiceId,
				coachId: coachId,
				durationMinutes: args.durationMinutes ?? 90,
			});
		}

		return { success: true };
	},
});
