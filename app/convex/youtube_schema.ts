import { defineTable } from "convex/server";
import { v } from "convex/values";

export const youtubeTables = {
	youtubeConnections: defineTable({
		clubId: v.id("clubs"),
		channelId: v.string(),
		channelName: v.string(),
		refreshToken: v.string(),
	}).index("by_club", ["clubId"]),
	youtubeAuthorizations: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		state: v.string(),
		expiresAt: v.number(),
	})
		.index("by_state", ["state"])
		.index("by_user", ["userId"])
		.index("by_expiration", ["expiresAt"]),
	youtubeUploads: defineTable({
		clubId: v.id("clubs"),
		ownerId: v.optional(v.id("users")),
		key: v.string(),
		name: v.string(),
		mime: v.string(),
		size: v.number(),
		sessionUrl: v.optional(v.string()),
		videoId: v.optional(v.string()),
		resourceId: v.optional(v.id("resources")),
		expiresAt: v.number(),
	})
		.index("by_owner_key", ["ownerId", "key"])
		.index("by_club", ["clubId"])
		.index("by_video", ["videoId"])
		.index("by_expiration", ["expiresAt"]),
};
