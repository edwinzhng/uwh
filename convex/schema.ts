import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	players: defineTable({
		fullName: v.string(),
		email: v.optional(v.string()),
		parentEmail: v.optional(v.string()),
		sporteasyId: v.optional(v.number()),
		positions: v.array(
			v.union(
				v.literal("FORWARD"),
				v.literal("WING"),
				v.literal("CENTER"),
				v.literal("FULL_BACK"),
			),
		),
		rating: v.number(),
		youth: v.boolean(),
	})
		.index("by_email", ["email"])
		.index("by_sporteasyId", ["sporteasyId"]),

	coaches: defineTable({
		playerId: v.id("players"),
		isActive: v.boolean(),
	}).index("by_playerId", ["playerId"]),

	practices: defineTable({
		sporteasyId: v.optional(v.number()),
		date: v.number(), // timestamp
		notes: v.optional(v.string()),
		discordReminderSentAt: v.optional(v.number()), // timestamp
		updatedAt: v.number(), // timestamp
	})
		.index("by_sporteasyId", ["sporteasyId"])
		.index("by_date", ["date"]),

	practiceCoaches: defineTable({
		practiceId: v.id("practices"),
		coachId: v.id("coaches"),
		durationMinutes: v.number(),
	})
		.index("by_practiceId", ["practiceId"])
		.index("by_coachId", ["coachId"])
		.index("by_practiceId_and_coachId", ["practiceId", "coachId"]),

	practicePlayerStatuses: defineTable({
		practiceId: v.id("practices"),
		playerId: v.id("players"),
		statusType: v.union(
			v.literal("LAST_MINUTE_ADDITION"),
			v.literal("LAST_MINUTE_CANCELLATION"),
			v.literal("LATE"),
		),
	})
		.index("by_practiceId", ["practiceId"])
		.index("by_playerId", ["playerId"])
		.index("by_practiceId_and_playerId", ["practiceId", "playerId"]),

	settings: defineTable({
		key: v.string(),
		value: v.string(),
		updatedAt: v.number(), // timestamp
	}).index("by_key", ["key"]),
});
