import { v } from "convex/values";
import {
	eventPartValue,
	repeatValue,
	signupClosesValue,
	signupOpensValue,
} from "./event_validator";
import { ageGroupValue, positionValue } from "./player_coaching_schema";

export const membersValue = v.object({
	id: v.string(),
	name: v.string(),
	programs: v.array(v.string()),
	position: v.string(),
	rating: v.number(),
	registration: v.union(
		v.literal("missing"),
		v.literal("submitted"),
		v.literal("approved"),
	),
	goal: v.string(),
	pendingGoal: v.optional(v.string()),
	steps: v.number(),
});
export const eventsValue = v.object({
	timeZone: v.optional(v.string()),
	parts: v.optional(v.array(eventPartValue)),
	public: v.optional(v.boolean()),
	exception: v.optional(v.boolean()),
	editId: v.optional(v.string()),
	seriesOrder: v.optional(v.number()),
	seriesDate: v.optional(v.string()),
	seasonId: v.optional(v.string()),
	eligiblePersonIds: v.optional(v.array(v.string())),
	repeat: v.optional(repeatValue),
	signupOpens: v.optional(signupOpensValue),
	signupCloses: v.optional(signupClosesValue),
	id: v.string(),
	title: v.string(),
	date: v.string(),
	start: v.string(),
	end: v.string(),
	venue: v.string(),
	program: v.string(),
	kind: v.union(
		v.literal("training"),
		v.literal("hockey"),
		v.literal("social"),
	),
	signup: v.union(
		v.literal("open"),
		v.literal("scheduled"),
		v.literal("closed"),
	),
	repeatInterval: v.optional(v.number()),
	repeatUntil: v.optional(v.string()),
	registrationOpen: v.optional(
		v.object({
			weeksBefore: v.number(),
			weekday: v.number(),
			time: v.string(),
		}),
	),
	registrationCloseHours: v.optional(v.number()),
	capacity: v.optional(v.number()),
	description: v.string(),
	cancelled: v.boolean(),
	seriesId: v.optional(v.string()),
	opensAt: v.optional(v.number()),
	closesAt: v.optional(v.number()),
});
export const responsesValue = v.object({
	partIds: v.optional(v.array(v.string())),
	partAttendance: v.optional(
		v.array(
			v.object({
				partId: v.string(),
				attendance: v.union(
					v.literal("unmarked"),
					v.literal("present"),
					v.literal("late"),
					v.literal("absent"),
				),
			}),
		),
	),
	id: v.string(),
	eventId: v.string(),
	personId: v.string(),
	response: v.union(
		v.literal("going"),
		v.literal("unavailable"),
		v.literal("unanswered"),
		v.literal("waiting"),
	),
	attendance: v.union(
		v.literal("unmarked"),
		v.literal("present"),
		v.literal("late"),
		v.literal("absent"),
	),
});
export const teamsValue = v.object({
	partId: v.optional(v.string()),
	coachingStale: v.optional(v.boolean()),
	separateYouth: v.optional(v.boolean()),
	excludedPersonIds: v.optional(v.array(v.string())),
	assignments: v.optional(
		v.array(
			v.object({
				personId: v.string(),
				position: positionValue,
				ageGroup: ageGroupValue,
			}),
		),
	),
	id: v.string(),
	eventId: v.string(),
	black: v.array(v.string()),
	white: v.array(v.string()),
	attendees: v.array(v.string()),
	published: v.boolean(),
});
export const plansValue = v.object({ id: v.string(), body: v.string() });
export const feedbackValue = v.object({
	id: v.string(),
	personId: v.string(),
	authorId: v.string(),
	body: v.string(),
	visibility: v.union(
		v.literal("draft"),
		v.literal("published"),
		v.literal("private"),
	),
	date: v.string(),
});
export const conversationsValue = v.object({
	id: v.string(),
	title: v.string(),
	subtitle: v.string(),
	accountIds: v.array(v.string()),
});
export const messagesValue = v.object({
	replyToId: v.optional(v.string()),
	edited: v.optional(v.boolean()),
	deleted: v.optional(v.boolean()),
	id: v.string(),
	threadId: v.string(),
	accountId: v.string(),
	author: v.string(),
	body: v.string(),
	time: v.string(),
	images: v.optional(v.array(v.object({ id: v.string(), name: v.string() }))),
	reactions: v.optional(
		v.array(v.object({ emoji: v.string(), accountIds: v.array(v.string()) })),
	),
});
export const noticesValue = v.object({
	id: v.string(),
	title: v.string(),
	body: v.string(),
	program: v.string(),
	date: v.string(),
	acknowledgedBy: v.array(v.string()),
});
export const equipmentValue = v.object({
	id: v.string(),
	name: v.string(),
	size: v.string(),
	condition: v.union(v.literal("ready"), v.literal("repair")),
	quantity: v.optional(v.number()),
});
export const loansValue = v.object({
	id: v.string(),
	itemId: v.string(),
	personId: v.string(),
	due: v.string(),
	returned: v.boolean(),
});
export const chargesValue = v.object({
	id: v.string(),
	personId: v.string(),
	amount: v.number(),
});
export const paymentsValue = v.object({
	id: v.string(),
	personId: v.string(),
	amount: v.number(),
	note: v.string(),
});
export const trackersValue = v.object({
	id: v.string(),
	name: v.string(),
	program: v.string(),
	kind: v.union(v.literal("check"), v.literal("text"), v.literal("date")),
});
export const trackerValuesValue = v.object({
	id: v.string(),
	value: v.string(),
});
