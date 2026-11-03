import { defineTable } from "convex/server";
import { v } from "convex/values";

export const planMediaValue = v.union(
	v.object({
		id: v.string(),
		label: v.string(),
		source: v.literal("link"),
		url: v.string(),
	}),
	v.object({
		id: v.string(),
		label: v.string(),
		source: v.literal("resource"),
		resourceId: v.string(),
	}),
);
export const sessionPlanTables = {
	sessionPlans: defineTable({
		clubId: v.id("clubs"),
		key: v.string(),
		eventId: v.string(),
		partId: v.optional(v.string()),
		body: v.string(),
		notes: v.string(),
		media: v.array(planMediaValue),
		revision: v.number(),
		published: v.optional(v.boolean()),
		publishedAt: v.optional(v.number()),
		updatedAt: v.number(),
		updatedBy: v.optional(v.id("users")),
	})
		.index("by_club_key", ["clubId", "key"])
		.index("by_club", ["clubId"])
		.index("by_author", ["updatedBy"]),
	sessionPlanRequests: defineTable({
		clubId: v.id("clubs"),
		actorId: v.id("users"),
		requestId: v.string(),
		payload: v.string(),
	})
		.index("by_request", ["clubId", "actorId", "requestId"])
		.index("by_club", ["clubId"])
		.index("by_actor", ["actorId"]),
};
