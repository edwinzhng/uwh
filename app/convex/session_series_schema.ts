import { defineTable } from "convex/server";
import { v } from "convex/values";
export const seriesEnrollment = v.object({
	personId: v.string(),
	start: v.string(),
	end: v.optional(v.string()),
	state: v.union(
		v.literal("committed"),
		v.literal("waiting"),
		v.literal("invited"),
	),
});
export const sessionSeriesTables = {
	sessionSeries: defineTable({
		clubId: v.id("clubs"),
		id: v.string(),
		seriesIds: v.array(v.string()),
		title: v.string(),
		capacity: v.optional(v.number()),
		waitlist: v.boolean(),
		enrollments: v.array(seriesEnrollment),
	})
		.index("by_club", ["clubId"])
		.index("by_key", ["clubId", "id"]),
};
