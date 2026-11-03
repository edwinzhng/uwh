import { defineTable } from "convex/server";
import { v } from "convex/values";

export const programCommandTables = {
	programCommands: defineTable({
		clubId: v.id("clubs"),
		actorId: v.id("users"),
		requestId: v.string(),
		payload: v.string(),
	})
		.index("by_club_actor_request", ["clubId", "actorId", "requestId"])
		.index("by_club", ["clubId"])
		.index("by_actor", ["actorId"]),
};
