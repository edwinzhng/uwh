import { defineTable } from "convex/server";
import { v } from "convex/values";

export const webPushTables = {
	webPushSubscriptions: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		sessionId: v.id("authSessions"),
		installationId: v.string(),
		endpoint: v.string(),
		p256dh: v.string(),
		auth: v.string(),
		vapidKey: v.string(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"])
		.index("by_installation", ["installationId"])
		.index("by_endpoint", ["endpoint"]),
	webPushDeliveries: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		jobId: v.id("pushJobs"),
		subscriptionId: v.id("webPushSubscriptions"),
		state: v.union(
			v.literal("pending"),
			v.literal("sent"),
			v.literal("failed"),
		),
		attempt: v.number(),
		updatedAt: v.number(),
		error: v.optional(v.string()),
	})
		.index("by_job_subscription", ["jobId", "subscriptionId"])
		.index("by_subscription", ["subscriptionId"])
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
	notificationTests: defineTable({
		userId: v.id("users"),
		lastSentAt: v.number(),
	}).index("by_user", ["userId"]),
};
