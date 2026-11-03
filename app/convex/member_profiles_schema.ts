import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memberProfileTables = {
	memberProfiles: defineTable({
		clubId: v.id("clubs"),
		personId: v.string(),
		capNumber: v.optional(v.number()),
		email: v.string(),
		phone: v.string(),
		photoId: v.optional(v.id("memberProfilePhotos")),
		revision: v.number(),
		lastKey: v.string(),
		lastActorId: v.optional(v.id("users")),
		lastPayload: v.string(),
		updatedAt: v.number(),
	})
		.index("by_club_person", ["clubId", "personId"])
		.index("by_photo", ["photoId"])
		.index("by_club", ["clubId"]),
	memberProfilePhotos: defineTable({
		clubId: v.id("clubs"),
		personId: v.string(),
		ownerId: v.optional(v.id("users")),
		key: v.string(),
		digest: v.string(),
		storageId: v.id("_storage"),
		mime: v.string(),
		size: v.number(),
		attached: v.boolean(),
	})
		.index("by_owner_key", ["ownerId", "key"])
		.index("by_owner_attached", ["ownerId", "attached"])
		.index("by_club_person", ["clubId", "personId"])
		.index("by_club", ["clubId"]),
};
