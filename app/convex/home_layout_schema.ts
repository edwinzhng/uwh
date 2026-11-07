import { defineTable } from "convex/server";
import { v } from "convex/values";
export const homeLayoutTables = {
	homeLayouts: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		view: v.union(v.literal("personal"), v.literal("coaching")),
		order: v.array(v.string()),
		hidden: v.array(v.string()),
		revision: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_club_view", ["userId", "clubId", "view"]),
};
