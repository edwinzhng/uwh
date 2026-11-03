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
	coachingScheduleHistory: defineTable({
		clubId: v.id("clubs"),
		validUntil: v.number(),
		...coachingScheduleValue,
		coaches: v.array(
			v.object({
				coachId: v.string(),
				personId: v.string(),
				name: v.string(),
				programIds: v.array(v.string()),
			}),
		),
	})
		.index("by_club", ["clubId"])
		.index("by_club_until", ["clubId", "validUntil"]),
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
