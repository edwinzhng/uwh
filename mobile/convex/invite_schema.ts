import { defineTable } from "convex/server";
import { v } from "convex/values";

export const inviteDelivery = v.union(
	v.literal("queued"),
	v.literal("sent"),
	v.literal("local"),
	v.literal("failed"),
);
export const inviteTables = {
	inviteLimits: defineTable({
		clubId: v.id("clubs"),
		key: v.string(),
		since: v.number(),
		count: v.number(),
	})
		.index("by_club", ["clubId"])
		.index("by_club_key", ["clubId", "key"])
		.index("by_key", ["key"]),
	clubInvites: defineTable({
		clubId: v.id("clubs"),
		email: v.string(),
		personId: v.string(),
		createdBy: v.optional(v.id("users")),
		revision: v.number(),
		expiresAt: v.number(),
		lastSentAt: v.number(),
		state: v.union(
			v.literal("pending"),
			v.literal("accepted"),
			v.literal("revoked"),
		),
		delivery: inviteDelivery,
		acceptedBy: v.optional(v.id("users")),
		siteUrl: v.string(),
	})
		.index("by_club", ["clubId"])
		.index("by_club_email", ["clubId", "email"])
		.index("by_person", ["clubId", "personId"])
		.index("by_email", ["email"])
		.index("by_sender", ["createdBy"]),
};
