import { defineTable } from "convex/server";
import { v } from "convex/values";

export const positionValue = v.union(
	v.literal("FORWARD"),
	v.literal("WING"),
	v.literal("CENTER"),
	v.literal("FULL_BACK"),
);
export const ageGroupValue = v.union(v.literal("adult"), v.literal("youth"));
export const playerCoachingTables = {
	playerCoaching: defineTable({
		clubId: v.id("clubs"),
		personId: v.string(),
		rating: v.number(),
		positions: v.array(positionValue),
		ageGroup: ageGroupValue,
		revision: v.number(),
	})
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
};
