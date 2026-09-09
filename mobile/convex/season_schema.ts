import { defineTable } from "convex/server";
import { v } from "convex/values";
export const registrationValue = v.union(
	v.literal("missing"),
	v.literal("submitted"),
	v.literal("approved"),
);
export const seasonTables = {
	seasonRecords: defineTable({
		clubId: v.id("clubs"),
		personId: v.string(),
		seasonId: v.string(),
		registration: registrationValue,
		cuga: v.boolean(),
		due: v.number(),
		paid: v.number(),
		revision: v.number(),
	})
		.index("by_club_season_person", ["clubId", "seasonId", "personId"])
		.index("by_club", ["clubId"])
		.index("by_club_person", ["clubId", "personId"]),
	seasonLedger: defineTable({
		clubId: v.id("clubs"),
		personId: v.string(),
		seasonId: v.string(),
		key: v.string(),
		kind: v.union(
			v.literal("payment"),
			v.literal("refund"),
			v.literal("dues"),
			v.literal("registration"),
		),
		amount: v.number(),
		note: v.string(),
		date: v.string(),
		actor: v.string(),
		actorId: v.optional(v.id("users")),
		createdAt: v.number(),
		before: v.string(),
		after: v.string(),
	})
		.index("by_record", ["clubId", "seasonId", "personId"])
		.index("by_club", ["clubId"])
		.index("by_actor", ["actorId"])
		.index("by_club_key", ["clubId", "key"])
		.index("by_club_person", ["clubId", "personId"]),
};
