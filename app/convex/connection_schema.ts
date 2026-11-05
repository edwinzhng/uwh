import { defineTable } from "convex/server";
import { v } from "convex/values";

export const socialProvider = v.union(v.literal("google"), v.literal("apple"));
export const connectionPurpose = v.union(
	v.literal("link"),
	v.literal("verify"),
);
export const connectionTables = {
	appleGrants: defineTable({
		userId: v.optional(v.id("users")),
		subject: v.string(),
		encryptedToken: v.string(),
		pending: v.boolean(),
		attempts: v.number(),
		nextAttemptAt: v.number(),
		authorizedAt: v.optional(v.number()),
		emailEnabled: v.optional(v.boolean()),
		lastNotificationAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_subject", ["subject"])
		.index("by_pending_attempt", ["pending", "nextAttemptAt"]),
	appleNotificationReceipts: defineTable({
		key: v.string(),
		expiresAt: v.number(),
	})
		.index("by_key", ["key"])
		.index("by_expiration", ["expiresAt"]),
	accountConnections: defineTable({
		userId: v.id("users"),
		sessionId: v.id("authSessions"),
		provider: socialProvider,
		purpose: connectionPurpose,
		state: v.union(v.literal("pending"), v.literal("complete")),
		expiresAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_session", ["sessionId"])
		.index("by_expiration", ["expiresAt"]),
};
