import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionPerformanceKind = v.union(
	v.literal("coach"),
	v.literal("self"),
);
export const sessionPerformanceTables = {
	sessionPerformance: defineTable({
		clubId: v.id("clubs"),
		personId: v.string(),
		eventId: v.string(),
		sessionNumber: v.optional(v.number()),
		eventTitle: v.string(),
		eventDate: v.string(),
		dateKind: v.optional(v.literal("recorded")),
		programId: v.string(),
		kind: sessionPerformanceKind,
		authorKey: v.string(),
		authorId: v.id("users"),
		authorName: v.string(),
		rating: v.number(),
		comments: v.string(),
		revision: v.number(),
		updatedAt: v.number(),
		removed: v.optional(v.boolean()),
	})
		.index("by_club", ["clubId"])
		.index("by_person", ["clubId", "personId", "eventDate"])
		.index("by_person_kind", ["clubId", "personId", "kind", "eventDate"])
		.index("by_identity", [
			"clubId",
			"personId",
			"eventId",
			"kind",
			"authorKey",
		])
		.index("by_author", ["authorId"]),
	sessionPerformanceRequests: defineTable({
		clubId: v.id("clubs"),
		actorId: v.id("users"),
		personId: v.string(),
		requestId: v.string(),
		payload: v.string(),
		entryId: v.id("sessionPerformance"),
	})
		.index("by_request", ["clubId", "actorId", "requestId"])
		.index("by_club", ["clubId"])
		.index("by_person", ["clubId", "personId"])
		.index("by_actor", ["actorId"]),
};
