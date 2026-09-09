import { defineTable } from "convex/server";
import { v } from "convex/values";

export const attendanceFlagValue = v.union(
	v.literal("addition"),
	v.literal("cancellation"),
);
export const attendanceReportTables = {
	eventAttendanceFlags: defineTable({
		clubId: v.id("clubs"),
		eventId: v.string(),
		personId: v.string(),
		kind: attendanceFlagValue,
	})
		.index("by_club", ["clubId"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_event", ["clubId", "eventId"])
		.index("by_event_person", ["clubId", "eventId", "personId"]),
};
