import { defineTable } from "convex/server";
import { v } from "convex/values";
import { membersValue } from "./validators";

export const memberMergeTables = {
	memberMerges: defineTable({
		clubId: v.id("clubs"),
		sourceId: v.string(),
		targetId: v.string(),
		sourceSnapshot: membersValue,
		targetSnapshot: membersValue,
		actorId: v.optional(v.id("users")),
		key: v.string(),
		token: v.string(),
		fillEmptyProfile: v.boolean(),
		createdAt: v.number(),
		filledFields: v.array(v.string()),
		counts: v.array(v.object({ label: v.string(), count: v.number() })),
		preserved: v.array(v.object({ category: v.string(), records: v.string() })),
	})
		.index("by_club_source", ["clubId", "sourceId"])
		.index("by_club_target", ["clubId", "targetId"])
		.index("by_club", ["clubId"]),
};
