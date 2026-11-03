import { defineTable } from "convex/server";
import { v } from "convex/values";
import { notificationSourceFields } from "./notification_schema";
import { notificationKind } from "./security_schema";

export const inboxTables = {
	inboxItems: defineTable({
		...notificationSourceFields,
		clubId: v.id("clubs"),
		userId: v.id("users"),
		key: v.string(),
		kind: notificationKind,
		entityId: v.string(),
		actorId: v.optional(v.id("users")),
		eventPhase: v.optional(
			v.union(
				v.literal("created"),
				v.literal("open"),
				v.literal("closing"),
				v.literal("changed"),
				v.literal("cancelled"),
			),
		),
		eventTimestamp: v.optional(v.number()),
		eventIds: v.optional(v.array(v.string())),
		createdAt: v.number(),
		readAt: v.optional(v.number()),
	})
		.index("by_user_key", ["userId", "key"])
		.index("by_user_club", ["userId", "clubId", "createdAt"])
		.index("by_user_club_read", ["userId", "clubId", "readAt", "createdAt"])
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
};
