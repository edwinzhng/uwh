import { defineTable } from "convex/server";
import { v } from "convex/values";

export const notificationKind = v.union(
	v.literal("messages"),
	v.literal("events"),
	v.literal("feedback"),
	v.literal("announcements"),
);
export const securityTables = {
	chatPolicies: defineTable({
		clubId: v.id("clubs"),
		blockedPhrases: v.array(v.string()),
	}).index("by_club", ["clubId"]),
	localEmails: defineTable({
		email: v.string(),
		purpose: v.string(),
		code: v.string(),
		expiresAt: v.number(),
	}).index("by_email", ["email"]),
	mailLimits: defineTable({ email: v.string(), sentAt: v.number() }).index(
		"by_email",
		["email"],
	),
	blocks: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		targetId: v.id("users"),
	})
		.index("by_user", ["userId"])
		.index("by_target", ["targetId"])
		.index("by_club", ["clubId"]),
	chatRestrictions: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		moderatorId: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
	chatReports: defineTable({
		clubId: v.id("clubs"),
		reporterId: v.optional(v.id("users")),
		subjectId: v.optional(v.id("users")),
		messageId: v.string(),
		threadId: v.string(),
		author: v.string(),
		body: v.string(),
		imageIds: v.array(v.string()),
		reason: v.string(),
		state: v.union(
			v.literal("open"),
			v.literal("dismissed"),
			v.literal("removed"),
		),
		reviewedBy: v.optional(v.id("users")),
		reviewedAt: v.optional(v.number()),
	})
		.index("by_club_state", ["clubId", "state"])
		.index("by_reporter_message", ["reporterId", "messageId"])
		.index("by_message", ["clubId", "messageId"])
		.index("by_club", ["clubId"])
		.index("by_reporter", ["reporterId"]),
	pushDevices: defineTable({
		userId: v.id("users"),
		sessionId: v.id("authSessions"),
		installationId: v.string(),
		token: v.string(),
		platform: v.union(v.literal("ios"), v.literal("android")),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_installation", ["installationId"])
		.index("by_token", ["token"]),
	pushPreferences: defineTable({
		userId: v.id("users"),
		messages: v.boolean(),
		events: v.boolean(),
		feedback: v.boolean(),
		announcements: v.boolean(),
	}).index("by_user", ["userId"]),
	pushJobs: defineTable({
		clubId: v.id("clubs"),
		kind: notificationKind,
		entityId: v.string(),
		actorId: v.optional(v.id("users")),
		eventPhase: v.optional(
			v.union(
				v.literal("open"),
				v.literal("closing"),
				v.literal("changed"),
				v.literal("cancelled"),
			),
		),
		eventTimestamp: v.optional(v.number()),
		eventIds: v.optional(v.array(v.string())),
		key: v.string(),
		createdAt: v.number(),
	})
		.index("by_key", ["key"])
		.index("by_club", ["clubId"]),
	pushDeliveries: defineTable({
		jobId: v.id("pushJobs"),
		deviceId: v.id("pushDevices"),
		token: v.string(),
		state: v.union(
			v.literal("pending"),
			v.literal("sent"),
			v.literal("delivered"),
			v.literal("failed"),
		),
		attempt: v.number(),
		ticketId: v.optional(v.string()),
		error: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index("by_job", ["jobId"])
		.index("by_device", ["deviceId"]),
};
