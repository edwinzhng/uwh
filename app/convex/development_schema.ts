import { defineTable } from "convex/server";
import { v } from "convex/values";
import { goalDetailsValue } from "./goal_schema";

export const developmentTables = {
	developmentPolicies: defineTable({
		clubId: v.id("clubs"),
		revision: v.number(),
		mode: v.union(v.literal("regular"), v.literal("selected")),
		reviewerIds: v.array(v.string()),
	}).index("by_club", ["clubId"]),
	goalReflections: defineTable({
		goalDetails: v.optional(goalDetailsValue),
		goalRevision: v.optional(v.number()),
		clubId: v.id("clubs"),
		personId: v.string(),
		authorId: v.id("users"),
		requestId: v.string(),
		goal: v.string(),
		note: v.string(),
		selfRating: v.number(),
		createdAt: v.number(),
		checkIn: v.number(),
	})
		.index("by_club_person_date", ["clubId", "personId", "createdAt"])
		.index("by_request", ["clubId", "authorId", "requestId"])
		.index("by_club", ["clubId"]),
	developmentRounds: defineTable({
		originPersonId: v.optional(v.string()),
		originRound: v.optional(v.number()),
		clubId: v.id("clubs"),
		personId: v.string(),
		round: v.number(),
		revision: v.number(),
		status: v.union(
			v.literal("open"),
			v.literal("finalized"),
			v.literal("superseded"),
		),
		requiredCoachIds: v.array(v.string()),
		profileRevision: v.number(),
		updatedAt: v.number(),
		finalizedRating: v.optional(v.number()),
		finalizedAt: v.optional(v.number()),
	})
		.index("by_club_person_round", ["clubId", "personId", "round"])
		.index("by_club", ["clubId"]),
	developmentReviews: defineTable({
		originPersonId: v.optional(v.string()),
		originRound: v.optional(v.number()),
		clubId: v.id("clubs"),
		personId: v.string(),
		round: v.number(),
		coachId: v.string(),
		revision: v.number(),
		status: v.union(v.literal("draft"), v.literal("submitted")),
		rating: v.optional(v.number()),
		observation: v.string(),
		updatedAt: v.number(),
	})
		.index("by_club_person_round", ["clubId", "personId", "round"])
		.index("by_author_round", ["clubId", "personId", "round", "coachId"])
		.index("by_club", ["clubId"]),
};
