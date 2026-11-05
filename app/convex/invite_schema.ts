import { defineTable } from "convex/server";
import { v } from "convex/values";

export const inviteDelivery = v.union(
	v.literal("queued"),
	v.literal("sent"),
	v.literal("local"),
	v.literal("failed"),
);
export const inviteTables = {
	staffInvites: defineTable({
		clubId: v.id("clubs"),
		createdBy: v.optional(v.id("users")),
		ownerAtIssue: v.optional(v.id("users")),
		hash: v.string(),
		admin: v.boolean(),
		coachPrograms: v.array(v.string()),
		expiresAt: v.number(),
		uses: v.number(),
		maxUses: v.number(),
		revoked: v.boolean(),
	})
		.index("by_hash", ["hash"])
		.index("by_club", ["clubId"])
		.index("by_club_active_expiry", ["clubId", "revoked", "expiresAt"])
		.index("by_sender", ["createdBy"])
		.index("by_owner", ["ownerAtIssue"]),
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
