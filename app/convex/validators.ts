import { v } from "convex/values";
import {
	eventPartValue,
	repeatValue,
	signupClosesValue,
	signupOpensValue,
} from "./event_validator";
import { goalDetailsValue } from "./goal_schema";
import { formationValue, lineupSnapshotValue } from "./lineup_schema";
import { ageGroupValue, positionValue } from "./player_coaching_schema";
import { programRsvpValue } from "./program_schema";

export const membersValue = v.object({
	mergedInto: v.optional(v.string()),
	mergedAt: v.optional(v.string()),
	id: v.string(),
	archived: v.optional(v.boolean()),
	archivedAt: v.optional(v.string()),
	name: v.string(),
	programs: v.array(v.string()),
	position: v.string(),
	rating: v.number(),
	ratingKnown: v.optional(v.boolean()),
	registration: v.union(
		v.literal("missing"),
		v.literal("submitted"),
		v.literal("approved"),
	),
	goal: v.string(),
	goalDetails: v.optional(goalDetailsValue),
	goalRevision: v.optional(v.number()),
	pendingGoalDetails: v.optional(goalDetailsValue),
	pendingGoalRevision: v.optional(v.number()),
	pendingGoal: v.optional(v.string()),
	steps: v.number(),
});
export const eventsValue = v.object({
	programRsvp: v.optional(programRsvpValue),
	programManaged: v.optional(v.boolean()),
	programRsvpManaged: v.optional(v.boolean()),
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
	endDate: v.optional(v.string()),
	responseDeadline: v.optional(v.string()),
	tournamentRoster: v.optional(
		v.array(v.object({ personId: v.string(), team: v.string() })),
	),

	start: v.string(),
	end: v.string(),
	venue: v.string(),
	program: v.string(),
	kind: v.union(
		v.literal("training"),
		v.literal("hockey"),
		v.literal("social"),
		v.literal("meeting"),
		v.literal("tournament"),
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
	declinedPartIds: v.optional(v.array(v.string())),
	seriesExpected: v.optional(v.boolean()),
	seriesInvitedAt: v.optional(v.number()),
	absenceReason: v.optional(v.string()),
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
	draftLineup: v.optional(lineupSnapshotValue),
	captains: v.optional(
		v.array(
			v.object({
				side: v.union(v.literal("black"), v.literal("white")),
				personId: v.string(),
			}),
		),
	),
	fieldSlots: v.optional(
		v.array(v.object({ personId: v.string(), slot: v.number() })),
	),
	rotationSlots: v.optional(
		v.array(v.object({ personId: v.string(), slot: v.number() })),
	),
	referees: v.optional(
		v.array(
			v.object({
				side: v.union(v.literal("black"), v.literal("white")),
				personId: v.string(),
			}),
		),
	),
	revision: v.optional(v.number()),
	blackFormation: v.optional(formationValue),
	whiteFormation: v.optional(formationValue),
	blackBench: v.optional(v.array(v.string())),
	whiteBench: v.optional(v.array(v.string())),
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
	authorName: v.optional(v.string()),
	category: v.optional(
		v.union(
			v.literal("mvp"),
			v.literal("above_usual"),
			v.literal("stood_out"),
			v.literal("great_session"),
		),
	),
	id: v.string(),
	kind: v.optional(v.union(v.literal("coaching"), v.literal("shoutout"))),
	personId: v.string(),
	authorId: v.string(),
	eventId: v.optional(v.string()),
	body: v.string(),
	visibility: v.union(
		v.literal("draft"),
		v.literal("published"),
		v.literal("private"),
	),
	date: v.string(),
});
export const conversationsValue = v.object({
	avatarIcon: v.optional(
		v.union(
			v.literal("message"),
			v.literal("users"),
			v.literal("calendar"),
			v.literal("shield"),
			v.literal("trophy"),
			v.literal("target"),
			v.literal("barChart"),
			v.literal("star"),
		),
	),
	avatarImageId: v.optional(v.string()),
	participantPersonIds: v.optional(v.array(v.string())),
	kind: v.optional(v.union(v.literal("direct"), v.literal("group"))),
	eventId: v.optional(v.string()),
	id: v.string(),
	title: v.string(),
	subtitle: v.string(),
	accountIds: v.array(v.string()),
});
export const messagesValue = v.object({
	pollId: v.optional(v.string()),
	createdAt: v.optional(v.number()),
	announcement: v.optional(v.boolean()),
	replyToId: v.optional(v.string()),
	edited: v.optional(v.boolean()),
	deleted: v.optional(v.boolean()),
	id: v.string(),
	threadId: v.string(),
	accountId: v.string(),
	author: v.string(),
	body: v.string(),
	time: v.string(),
	images: v.optional(
		v.array(
			v.object({
				id: v.string(),
				name: v.string(),
				mime: v.optional(v.string()),
			}),
		),
	),
	reactions: v.optional(
		v.array(v.object({ emoji: v.string(), accountIds: v.array(v.string()) })),
	),
});
export const noticesValue = v.object({
	id: v.string(),
	postedAt: v.optional(v.number()),
	title: v.string(),
	body: v.string(),
	program: v.string(),
	date: v.string(),
	acknowledgedBy: v.array(v.string()),
	dismissedBy: v.optional(v.array(v.string())),
	expiresAt: v.optional(v.string()),
});
export const equipmentValue = v.object({
	id: v.string(),
	name: v.string(),
	size: v.string(),
	condition: v.union(v.literal("ready"), v.literal("repair")),
	quantity: v.optional(v.number()),
});
export const memberLoanValue = v.object({
	id: v.string(),
	itemId: v.string(),
	personId: v.string(),
	due: v.string(),
	returned: v.boolean(),
});
export const loansValue = v.union(
	memberLoanValue,
	v.object({
		id: v.string(),
		itemId: v.string(),
		borrower: v.object({
			kind: v.literal("guest"),
			guestId: v.string(),
			eventId: v.string(),
			name: v.string(),
			practiceTitle: v.string(),
			practiceDate: v.string(),
		}),
		due: v.string(),
		returned: v.boolean(),
	}),
);
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
