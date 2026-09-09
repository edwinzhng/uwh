import { defineTable } from "convex/server";
import { v } from "convex/values";
export const importKindValue = v.union(
	v.literal("members"),
	v.literal("events"),
	v.literal("attendance"),
	v.literal("registration"),
	v.literal("payments"),
);
export const importTables = {
	importReferences: defineTable({
		clubId: v.id("clubs"),
		source: v.string(),
		kind: importKindValue,
		sourceId: v.string(),
		seasonId: v.optional(v.string()),
		targetId: v.string(),
		fingerprint: v.string(),
		personId: v.optional(v.string()),
	})
		.index("by_source", ["clubId", "source", "kind", "sourceId", "seasonId"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
	importRuns: defineTable({
		clubId: v.id("clubs"),
		source: v.string(),
		kind: importKindValue,
		key: v.string(),
		createdAt: v.number(),
		actor: v.string(),
		actorId: v.optional(v.id("users")),
		created: v.number(),
		skipped: v.number(),
	})
		.index("by_club_key", ["clubId", "key"])
		.index("by_actor", ["actorId"])
		.index("by_club", ["clubId"]),
};
