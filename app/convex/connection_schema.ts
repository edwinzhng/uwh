import { defineTable } from "convex/server";
import { v } from "convex/values";

export const socialProvider = v.union(v.literal("google"), v.literal("apple"));
export const connectionPurpose = v.union(
	v.literal("link"),
	v.literal("verify"),
);
export const connectionTables = {
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
