import { defineTable } from "convex/server";
import { v } from "convex/values";

export const householdTables = {
	householdLinks: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		personId: v.string(),
		origin: v.union(
			v.literal("created"),
			v.literal("administrator"),
			v.literal("previous"),
		),
		state: v.union(
			v.literal("available"),
			v.literal("accepted"),
			v.literal("dismissed"),
			v.literal("revoked"),
		),
		createdBy: v.optional(v.id("users")),
		key: v.string(),
		payload: v.string(),
		createdAt: v.number(),
	})
		.index("by_club_user", ["clubId", "userId"])
		.index("by_user", ["userId"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club_user_person", ["clubId", "userId", "personId"])
		.index("by_club_user_key", ["clubId", "userId", "key"])
		.index("by_club", ["clubId"]),
};
