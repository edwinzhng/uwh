import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { attendanceReportTables } from "./attendance_report_schema";
import { calendarEntry } from "./calendar_schema";
import { coachingHoursTables } from "./coaching_hours_schema";
import { connectionTables } from "./connection_schema";
import { fitnessTables } from "./fitness_schema";
import { importTables } from "./import_schema";
import { inviteTables } from "./invite_schema";
import { playerCoachingTables } from "./player_coaching_schema";
import { seasonTables } from "./season_schema";
import { securityTables } from "./security_schema";
import { sessionSeriesTables } from "./session_series_schema";
import {
	chargesValue,
	conversationsValue,
	equipmentValue,
	eventsValue,
	feedbackValue,
	loansValue,
	membersValue,
	messagesValue,
	noticesValue,
	paymentsValue,
	plansValue,
	responsesValue,
	teamsValue,
	trackersValue,
	trackerValuesValue,
} from "./validators";

export default defineSchema({
	websiteLoginAttempts: defineTable({ fingerprint: v.string() }).index(
		"by_fingerprint",
		["fingerprint"],
	),
	websiteContent: defineTable({ json: v.string() }),
	websiteEnquiries: defineTable({
		phone: v.optional(v.string()),
		gender: v.optional(v.string()),
		firstSessionDate: v.optional(v.string()),
		referral: v.optional(v.string()),
		referralOther: v.optional(v.string()),
		name: v.string(),
		email: v.string(),
		interest: v.string(),
		message: v.string(),
		fingerprint: v.string(),
	})
		.index("by_fingerprint", ["fingerprint"])
		.index("by_email", ["email"]),
	...authTables,
	...attendanceReportTables,
	...playerCoachingTables,
	...coachingHoursTables,
	...fitnessTables,
	...connectionTables,
	...securityTables,
	...sessionSeriesTables,
	...inviteTables,
	...seasonTables,
	...importTables,
	publicCalendarEntries: defineTable({
		clubId: v.id("clubs"),
		value: calendarEntry,
	}).index("by_club", ["clubId"]),
	conversationReads: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		threadId: v.string(),
		through: v.number(),
	})
		.index("by_user_thread", ["userId", "threadId"])
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
	calendarFeeds: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		personId: v.string(),
		token: v.string(),
		includeWaitlisted: v.boolean(),
	})
		.index("by_user", ["userId"])
		.index("by_user_person", ["userId", "personId"])
		.index("by_token", ["token"]),
	calendarEntries: defineTable({
		feedId: v.id("calendarFeeds"),
		value: calendarEntry,
	}).index("by_feed", ["feedId"]),
	images: defineTable({
		clubId: v.id("clubs"),
		threadId: v.string(),
		ownerId: v.id("users"),
		storageId: v.id("_storage"),
		name: v.string(),
		mime: v.string(),
		size: v.number(),
		messageId: v.optional(v.string()),
	})
		.index("by_owner", ["ownerId"])
		.index("by_owner_message", ["ownerId", "messageId"]),
	clubs: defineTable({
		venues: v.optional(v.array(v.string())),
		timeZone: v.optional(v.string()),
		publicSlug: v.optional(v.string()),
		publicSchedule: v.optional(v.boolean()),
		seasons: v.optional(
			v.array(
				v.object({
					id: v.string(),
					name: v.string(),
					start: v.string(),
					end: v.string(),
				}),
			),
		),
		name: v.string(),
		ownerId: v.id("users"),
		reminders: v.boolean(),
	}).index("by_public_slug", ["publicSlug"]),
	memberships: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		name: v.string(),
		personId: v.string(),
		children: v.array(v.string()),
		coachPrograms: v.array(v.string()),
		admin: v.boolean(),
	})
		.index("by_person", ["clubId", "personId"])
		.index("by_user", ["userId"])
		.index("by_club", ["clubId"]),
	joinRequests: defineTable({
		clubId: v.id("clubs"),
		userId: v.id("users"),
		name: v.string(),
		state: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("declined"),
		),
	})
		.index("by_club_state", ["clubId", "state"])
		.index("by_club", ["clubId"])
		.index("by_user", ["userId"]),
	members: defineTable({ clubId: v.id("clubs"), value: membersValue })
		.searchIndex("search_name", {
			searchField: "value.name",
			filterFields: ["clubId"],
		})
		.index("by_name", ["clubId", "value.name"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	events: defineTable({ clubId: v.id("clubs"), value: eventsValue })
		.index("by_club_kind_date", ["clubId", "value.kind", "value.date"])
		.index("by_date", ["clubId", "value.date", "value.start"])
		.index("by_public_date", [
			"clubId",
			"value.public",
			"value.date",
			"value.start",
		])
		.index("by_season_date", [
			"clubId",
			"value.seasonId",
			"value.date",
			"value.start",
		])
		.index("by_series", ["clubId", "value.seriesId"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	responses: defineTable({ clubId: v.id("clubs"), value: responsesValue })
		.index("by_event", ["clubId", "value.eventId"])
		.index("by_person", ["clubId", "value.personId"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	teams: defineTable({ clubId: v.id("clubs"), value: teamsValue })
		.index("by_event", ["clubId", "value.eventId"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	plans: defineTable({ clubId: v.id("clubs"), value: plansValue })
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	feedback: defineTable({ clubId: v.id("clubs"), value: feedbackValue })
		.index("by_person_date", ["clubId", "value.personId", "value.date"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	conversations: defineTable({
		clubId: v.id("clubs"),
		directKey: v.optional(v.string()),
		value: conversationsValue,
	})
		.index("by_direct", ["clubId", "directKey"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	messages: defineTable({ clubId: v.id("clubs"), value: messagesValue })
		.index("by_thread", ["clubId", "value.threadId"])
		.index("by_author", ["clubId", "value.accountId"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	notices: defineTable({ clubId: v.id("clubs"), value: noticesValue })
		.index("by_date", ["clubId", "value.date"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	equipment: defineTable({ clubId: v.id("clubs"), value: equipmentValue })
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	loans: defineTable({ clubId: v.id("clubs"), value: loansValue })
		.index("by_returned", ["clubId", "value.returned"])
		.index("by_item_active", ["clubId", "value.itemId", "value.returned"])
		.index("by_person", ["clubId", "value.personId"])
		.index("by_person_active", ["clubId", "value.personId", "value.returned"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	charges: defineTable({
		clubId: v.id("clubs"),
		value: chargesValue,
		paidTotal: v.optional(v.number()),
	})
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	payments: defineTable({ clubId: v.id("clubs"), value: paymentsValue })
		.index("by_person", ["clubId", "value.personId"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	trackers: defineTable({ clubId: v.id("clubs"), value: trackersValue })
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	trackerValues: defineTable({
		clubId: v.id("clubs"),
		value: trackerValuesValue,
	})
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
});
