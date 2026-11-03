import { defineTable } from "convex/server";
import { v } from "convex/values";

export const positionValue = v.union(
	v.literal("FORWARD"),
	v.literal("WING"),
	v.literal("CENTER"),
	v.literal("FULL_BACK"),
);
export const ageGroupValue = v.union(v.literal("adult"), v.literal("youth"));
export const coachingGenderValue = v.union(
	v.literal("male"),
	v.literal("female"),
	v.literal("other"),
);
export const playerCoachingTables = {
	playerCoaching: defineTable({
		scores: v.optional(
			v.array(
				v.object({
					coachId: v.string(),
					score: v.number(),
					revision: v.number(),
				}),
			),
		),
		clubId: v.id("clubs"),
		personId: v.string(),
		rating: v.number(),
		ratingKnown: v.optional(v.boolean()),
		positions: v.array(positionValue),
		ageGroup: ageGroupValue,
		gender: v.optional(coachingGenderValue),
		revision: v.number(),
	})
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
};
