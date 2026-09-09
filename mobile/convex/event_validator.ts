import { v } from "convex/values";

export const repeatValue = v.union(
	v.literal("once"),
	v.literal("daily"),
	v.literal("weekdays"),
	v.literal("weekly"),
	v.literal("fortnightly"),
	v.literal("monthly"),
);
export const signupOpensValue = v.union(
	v.literal("now"),
	v.literal("three-days"),
	v.literal("week"),
);
export const signupClosesValue = v.union(
	v.literal("start"),
	v.literal("hour"),
	v.literal("day"),
);
export const eventDraftValue = v.object({
	public: v.optional(v.boolean()),
	rebuild: v.optional(v.boolean()),
	seasonId: v.optional(v.string()),
	title: v.string(),
	date: v.string(),
	start: v.string(),
	end: v.string(),
	venue: v.string(),
	program: v.string(),
	kind: v.union(
		v.literal("training"),
		v.literal("hockey"),
		v.literal("social"),
	),
	capacity: v.number(),
	description: v.string(),
	repeat: repeatValue,
	occurrences: v.optional(v.number()),
	eligiblePersonIds: v.optional(v.array(v.string())),
	signupOpens: v.optional(signupOpensValue),
	signupCloses: v.optional(signupClosesValue),
});
