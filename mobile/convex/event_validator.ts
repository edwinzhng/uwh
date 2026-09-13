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
export const eventPartValue = v.object({
	id: v.string(),
	title: v.string(),
	kind: v.union(v.literal("training"), v.literal("hockey")),
	start: v.string(),
	end: v.string(),
});
export const eventDraftValue = v.object({
	committedRoster: v.optional(v.boolean()),
	seriesWaitlist: v.optional(v.boolean()),
	excludedDates: v.optional(v.array(v.string())),
	timeZone: v.optional(v.string()),
	parts: v.optional(v.array(eventPartValue)),
	public: v.optional(v.boolean()),
	rebuild: v.optional(v.boolean()),
	seasonId: v.optional(v.string()),
	title: v.string(),
	date: v.string(),
	endDate: v.optional(v.string()),
	responseDeadline: v.optional(v.string()),
	tournamentRoster: v.optional(
		v.array(v.object({ personId: v.string(), team: v.string() })),
	),

	start: v.string(),
	end: v.string(),
	venue: v.string(),
	program: v.string(),
	kind: v.union(
		v.literal("training"),
		v.literal("hockey"),
		v.literal("social"),
		v.literal("tournament"),
	),
	repeatInterval: v.optional(v.number()),
	repeatUntil: v.optional(v.string()),
	registrationOpen: v.optional(
		v.object({
			weeksBefore: v.number(),
			weekday: v.number(),
			time: v.string(),
		}),
	),
	registrationCloseHours: v.optional(v.number()),
	capacity: v.optional(v.number()),
	description: v.string(),
	repeat: repeatValue,
	occurrences: v.optional(v.number()),
	eligiblePersonIds: v.optional(v.array(v.string())),
	signupOpens: v.optional(signupOpensValue),
	signupCloses: v.optional(signupClosesValue),
});
