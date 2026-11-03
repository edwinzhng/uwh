import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionCheckinTables = {
	sessionCheckins: defineTable({
		clubId: v.id("clubs"),
		eventId: v.string(),
		personId: v.string(),
		energy: v.number(),
		note: v.string(),
		actorId: v.id("users"),
		updatedAt: v.number(),
	})
		.index("by_event", ["clubId", "eventId"])
		.index("by_person_event", ["clubId", "personId", "eventId"])
		.index("by_person", ["clubId", "personId"])
		.index("by_actor", ["actorId"])
		.index("by_club", ["clubId"]),
};
