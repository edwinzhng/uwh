import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getDefaultPracticeDurationMinutes } from "./practiceDuration";

const validateDuration = (durationMinutes: number): void => {
	if (
		!Number.isInteger(durationMinutes) ||
		durationMinutes < 15 ||
		durationMinutes > 24 * 60 ||
		durationMinutes % 15 !== 0
	) {
		throw new Error(
			"Coach hours must be between 0.25 and 24 hours in 0.25-hour increments",
		);
	}
};

export const addCoachToPractice = mutation({
	args: {
		practiceId: v.id("practices"),
		coachId: v.id("coaches"),
		durationMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		if (args.durationMinutes !== undefined) {
			validateDuration(args.durationMinutes);
		}

		const existing = await ctx.db
			.query("practiceCoaches")
			.withIndex("by_practiceId_and_coachId", (q) =>
				q.eq("practiceId", args.practiceId).eq("coachId", args.coachId),
			)
			.unique();

		if (existing) {
			throw new Error("Coach already assigned to this practice");
		}

		const practice = await ctx.db.get(args.practiceId);
		if (!practice) {
			throw new Error("Practice not found");
		}

		return await ctx.db.insert("practiceCoaches", {
			practiceId: args.practiceId,
			coachId: args.coachId,
			durationMinutes:
				args.durationMinutes ??
				getDefaultPracticeDurationMinutes(practice.date),
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
		coaches: v.array(
			v.object({
				coachId: v.id("coaches"),
				durationMinutes: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		for (const { durationMinutes } of args.coaches) {
			validateDuration(durationMinutes);
		}

		const requestedCoachIds = new Set(
			args.coaches.map(({ coachId }) => coachId),
		);
		if (requestedCoachIds.size !== args.coaches.length) {
			throw new Error("A coach can only be assigned once per practice");
		}

		const existing = await ctx.db
			.query("practiceCoaches")
			.withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
			.collect();

		await Promise.all(
			existing
				.filter(({ coachId }) => !requestedCoachIds.has(coachId))
				.map(({ _id }) => ctx.db.delete(_id)),
		);

		await Promise.all(
			args.coaches.map(({ coachId, durationMinutes }) => {
				const existingCoach = existing.find(
					(practiceCoach) => practiceCoach.coachId === coachId,
				);
				return existingCoach
					? ctx.db.patch(existingCoach._id, { durationMinutes })
					: ctx.db.insert("practiceCoaches", {
							practiceId: args.practiceId,
							coachId,
							durationMinutes,
						});
			}),
		);

		return { success: true };
	},
});
