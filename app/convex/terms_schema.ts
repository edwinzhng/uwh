import { defineTable } from "convex/server";
import { v } from "convex/values";

export const termsTables = {
	termsSettings: defineTable({
		clubId: v.id("clubs"),
		policyId: v.id("termsVersions"),
		required: v.boolean(),
		revision: v.number(),
	}).index("by_club", ["clubId"]),
	termsVersions: defineTable({
		clubId: v.id("clubs"),
		version: v.string(),
		title: v.string(),
		body: v.string(),
		publishedAt: v.number(),
		actorId: v.optional(v.id("users")),
		key: v.string(),
	})
		.index("by_club", ["clubId"])
		.index("by_club_version", ["clubId", "version"])
		.index("by_club_actor_key", ["clubId", "actorId", "key"]),
	termsAcceptances: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		policyId: v.id("termsVersions"),
		acceptedAt: v.number(),
	})
		.index("by_user_policy", ["userId", "policyId"])
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
};
