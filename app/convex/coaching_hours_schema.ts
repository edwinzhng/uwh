import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coachingHoursTables = {
	coachingHours: defineTable({
		clubId: v.id("clubs"),
		eventId: v.string(),
		coachId: v.id("users"),
		personId: v.string(),
		name: v.string(),
		durationMinutes: v.number(),
		partIds: v.optional(v.array(v.string())),
	})
		.index("by_club", ["clubId"])
		.index("by_club_event", ["clubId", "eventId"])
		.index("by_club_event_coach", ["clubId", "eventId", "coachId"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_coach", ["coachId"]),
};
