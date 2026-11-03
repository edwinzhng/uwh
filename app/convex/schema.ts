import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { attendanceReportTables } from "./attendance_report_schema";
import { calendarEntry } from "./calendar_schema";
import { coachingHoursTables } from "./coaching_hours_schema";
import { coachingScheduleTables } from "./coaching_schedule_schema";
import { connectionTables } from "./connection_schema";
import { developmentTables } from "./development_schema";
import { equipmentLoanTables } from "./equipment_loans_schema";
import { fitnessTables } from "./fitness_schema";
import { householdTables } from "./household_schema";
import { importTables } from "./import_schema";
import { inboxTables } from "./inbox_schema";
import { inviteTables } from "./invite_schema";
import { localMigrationTables } from "./local_migration_schema";
import { memberMergeTables } from "./member_merge_schema";
import { memberProfileTables } from "./member_profiles_schema";
import { messageAnnouncementTables } from "./message_announcements_schema";
import { playerCoachingTables } from "./player_coaching_schema";
import { programCommandTables } from "./program_commands_schema";
import { clubProgramValue } from "./program_schema";
import { resourceTables } from "./resources_schema";
import { seasonTables } from "./season_schema";
import { securityTables } from "./security_schema";
import { sessionCheckinTables } from "./session_checkins_schema";
import { sessionPerformanceTables } from "./session_performance_schema";
import { sessionPlanTables } from "./session_plans_schema";
import { sessionSeriesTables } from "./session_series_schema";
import { termsTables } from "./terms_schema";
import { threadToolsTables } from "./thread_tools_schema";
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
import { webPushTables } from "./web_push_schema";

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
	...resourceTables,
	...programCommandTables,
	...threadToolsTables,
	...coachingHoursTables,
	...coachingScheduleTables,
	...fitnessTables,
	...connectionTables,
	...developmentTables,
	...equipmentLoanTables,
	...securityTables,
	...sessionCheckinTables,
	...sessionPlanTables,
	...sessionPerformanceTables,
	...sessionSeriesTables,
	...inviteTables,
	...localMigrationTables,
	...memberProfileTables,
	...memberMergeTables,
	...seasonTables,
	...importTables,
	...householdTables,
	...inboxTables,
	...termsTables,
	...webPushTables,
	...messageAnnouncementTables,
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
		.index("by_club", ["clubId"])
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
		chatAvatar: v.optional(v.boolean()),
	})
		.index("by_owner", ["ownerId"])
		.index("by_owner_message", ["ownerId", "messageId"]),
	clubs: defineTable({
		programs: v.optional(v.array(clubProgramValue)),
		inviteCode: v.optional(v.string()),
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
	})
		.index("by_invite_code", ["inviteCode"])
		.index("by_public_slug", ["publicSlug"]),
	memberships: defineTable({
		defaultPersonId: v.optional(v.string()),
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
		.index("by_pending_goal", ["clubId", "value.pendingGoal"])
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
		.index("by_program_date", [
			"clubId",
			"value.program",
			"value.date",
			"value.start",
		])
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
		.index("by_author_visibility", [
			"clubId",
			"value.authorId",
			"value.visibility",
		])
		.index("by_club_kind_visibility", [
			"clubId",
			"value.kind",
			"value.visibility",
		])
		.index("by_club_kind_visibility_date", [
			"clubId",
			"value.kind",
			"value.visibility",
			"value.date",
			"value.id",
		])
		.index("by_person_date", ["clubId", "value.personId", "value.date"])
		.index("by_event_date", ["clubId", "value.eventId", "value.date"])
		.index("by_club", ["clubId"])
		.index("by_club_and_key", ["clubId", "value.id"]),
	conversations: defineTable({
		clubId: v.id("clubs"),
		pendingPersonId: v.optional(v.string()),
		pendingPersonIds: v.optional(v.array(v.string())),
		groupSourceThreadId: v.optional(v.string()),
		groupSourceRecipientIds: v.optional(v.array(v.string())),
		groupCreatorId: v.optional(v.id("users")),
		groupCreation: v.optional(
			v.object({ name: v.string(), recipientIds: v.array(v.string()) }),
		),
		recipientPersonId: v.optional(v.string()),
		directKey: v.optional(v.string()),
		value: conversationsValue,
	})
		.index("by_direct", ["clubId", "directKey"])
		.index("by_group_creator", ["clubId", "groupCreatorId"])
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
