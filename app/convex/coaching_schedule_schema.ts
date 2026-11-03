import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coachingWeekdayValue = v.union(
	v.literal("monday"),
	v.literal("tuesday"),
	v.literal("wednesday"),
	v.literal("thursday"),
	v.literal("friday"),
	v.literal("saturday"),
	v.literal("sunday"),
);
export const coachingScheduleValue = {
	programs: v.optional(
		v.array(v.object({ programId: v.string(), coachIds: v.array(v.string()) })),
	),
	days: v.array(
		v.object({ weekday: coachingWeekdayValue, coachIds: v.array(v.string()) }),
	),
	backupCoachIds: v.array(v.string()),
	revision: v.number(),
};
export const coachingScheduleTables = {
	coachingSchedules: defineTable({
		clubId: v.id("clubs"),
		...coachingScheduleValue,
	}).index("by_club", ["clubId"]),
	coachingEventOverrides: defineTable({
		clubId: v.id("clubs"),
		eventId: v.string(),
	})
		.index("by_club", ["clubId"])
		.index("by_club_event", ["clubId", "eventId"]),
};
