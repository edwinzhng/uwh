import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	fitnessTests: defineTable({
		archivedAt: v.optional(v.number()),
		name: v.string(),
		unit: v.union(
			v.literal("TIME"),
			v.literal("COUNT"),
			v.literal("PASS_FAIL"),
		),
		updatedAt: v.number(),
	})
		.index("by_archivedAt_and_name", ["archivedAt", "name"])
		.index("by_name", ["name"])
		.index("by_updatedAt", ["updatedAt"]),

	fitnessTestSessions: defineTable({
		fitnessTestId: v.id("fitnessTests"),
		date: v.number(),
		updatedAt: v.number(),
	})
		.index("by_fitnessTestId", ["fitnessTestId"])
		.index("by_fitnessTestId_and_date", ["fitnessTestId", "date"]),

	fitnessTestResults: defineTable({
		fitnessTestSessionId: v.id("fitnessTestSessions"),
		playerId: v.id("players"),
		value: v.string(),
		notes: v.optional(v.string()),
		updatedAt: v.number(),
	})
		.index("by_fitnessTestSessionId", ["fitnessTestSessionId"])
		.index("by_playerId", ["playerId"])
		.index("by_playerId_and_fitnessTestSessionId", [
			"playerId",
			"fitnessTestSessionId",
		]),

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

	practiceAttendance: defineTable({
		practiceId: v.id("practices"),
		playerId: v.id("players"),
		attended: v.boolean(),
		source: v.union(v.literal("manual"), v.literal("sporteasy")),
		updatedAt: v.number(),
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
