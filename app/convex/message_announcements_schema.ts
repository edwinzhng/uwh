import { defineTable } from "convex/server";
import { v } from "convex/values";

export const messageAnnouncementTables = {
	chatAnnouncements: defineTable({
		clubId: v.id("clubs"),
		threadId: v.string(),
		messageId: v.string(),
		createdBy: v.optional(v.id("users")),
		createdAt: v.number(),
		version: v.string(),
		acknowledgedBy: v.array(v.id("users")),
	})
		.index("by_thread", ["clubId", "threadId", "createdAt"])
		.index("by_message", ["clubId", "messageId"])
		.index("by_club", ["clubId"]),
	chatAnnouncementAcks: defineTable({
		clubId: v.id("clubs"),
		announcementId: v.id("chatAnnouncements"),
		userId: v.id("users"),
		version: v.string(),
		acknowledgedAt: v.number(),
	})
		.index("by_person_version", ["announcementId", "userId", "version"])
		.index("by_announcement", ["announcementId"])
		.index("by_announcement_version", ["announcementId", "version"])
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
};
