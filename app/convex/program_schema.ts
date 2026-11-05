import { v } from "convex/values";

export const programRsvpValue = v.object({
	openRule: v.optional(
		v.union(
			v.literal("before-event"),
			v.literal("weekly"),
			v.literal("season"),
		),
	),
	openWeekday: v.optional(v.number()),
	openWeeks: v.optional(v.number()),
	notifyOnOpen: v.optional(v.boolean()),
	openDays: v.number(),
	openTime: v.string(),
	closeDays: v.number(),
	closeTime: v.string(),
	reminderDays: v.number(),
	defaultResponse: v.union(
		v.literal("none"),
		v.literal("going"),
		v.literal("unavailable"),
	),
});

export const programDraftValue = {
	id: v.string(),
	name: v.string(),
	description: v.optional(v.string()),
	archived: v.boolean(),
	status: v.union(
		v.literal("draft"),
		v.literal("active"),
		v.literal("completed"),
	),
	kind: v.union(
		v.literal("training"),
		v.literal("hockey"),
		v.literal("social"),
		v.literal("tournament"),
		v.literal("meeting"),
	),
	seasonId: v.optional(v.string()),
	schedule: v.optional(
		v.object({
			startDate: v.string(),
			endDate: v.string(),
			weekday: v.number(),
			start: v.string(),
			end: v.string(),
			venue: v.string(),
		}),
	),
	rsvp: programRsvpValue,
};
export const clubProgramValue = v.object({
	...programDraftValue,
	revision: v.number(),
});
