import { defineTable } from "convex/server";
import { v } from "convex/values";
export const fitnessUnit = v.union(
	v.literal("time"),
	v.literal("count"),
	v.literal("pass_fail"),
);
export const fitnessTables = {
	fitnessTests: defineTable({
		clubId: v.id("clubs"),
		name: v.string(),
		unit: fitnessUnit,
		archived: v.boolean(),
		revision: v.number(),
	})
		.index("by_club_archive", ["clubId", "archived"])
		.index("by_club", ["clubId"]),
	fitnessSessions: defineTable({
		clubId: v.id("clubs"),
		testId: v.id("fitnessTests"),
		seasonId: v.string(),
		date: v.string(),
		notes: v.string(),
		revision: v.number(),
		resultCount: v.number(),
	})
		.index("by_test_season_date", ["testId", "seasonId", "date"])
		.index("by_test_date", ["testId", "date"])
		.index("by_club", ["clubId"]),
	fitnessResults: defineTable({
		clubId: v.id("clubs"),
		testId: v.id("fitnessTests"),
		sessionId: v.id("fitnessSessions"),
		seasonId: v.string(),
		personId: v.string(),
		date: v.string(),
		value: v.number(),
		notes: v.string(),
	})
		.index("by_session_person", ["sessionId", "personId"])
		.index("by_person_date", ["testId", "seasonId", "personId", "date"])
		.index("by_person_value", ["testId", "seasonId", "personId", "value"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
	fitnessStats: defineTable({
		clubId: v.id("clubs"),
		testId: v.id("fitnessTests"),
		seasonId: v.string(),
		personId: v.string(),
		count: v.number(),
		total: v.number(),
		best: v.number(),
	})
		.index("by_test_season_person", ["testId", "seasonId", "personId"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
};
