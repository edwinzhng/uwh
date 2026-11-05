import type { ChatAppearance } from "./chat-appearance";
import type { Attendance, Response } from "./club";
import type { GoalDetails } from "./goals";
import type { LineupSnapshot } from "./lineup";
import type { MessageImage, MessageReaction } from "./messaging";
import type { AgeGroup, PlayerCoaching, Position } from "./player-coaching";
import type { ClubProgram, ProgramDraft, ProgramRsvp } from "./programs";
import type { ShoutoutCategory } from "./shoutouts";

export type Season = { id: string; name: string; start: string; end: string };
export type Account = {
	defaultPersonId?: string;
	id: string;
	personId: string;
	name: string;
	children: string[];
	coachPrograms: string[];
	admin: boolean;
};
export type Member = {
	id: string;
	mergedInto?: string;
	mergedAt?: string;
	archived?: boolean;
	archivedAt?: string;
	name: string;
	programs: string[];
	position: string;
	rating: number;
	ratingKnown?: boolean;
	registration: "missing" | "submitted" | "approved";
	goal: string;
	goalDetails?: GoalDetails;
	goalRevision?: number;
	pendingGoalDetails?: GoalDetails;
	pendingGoalRevision?: number;
	pendingGoal?: string;
	steps: number;
};
export type EventPart = {
	id: string;
	title: string;
	kind: "training" | "hockey";
	start: string;
	end: string;
};
export type ClubEvent = {
	programRsvp?: ProgramRsvp;
	programManaged?: boolean;
	programRsvpManaged?: boolean;
	timeZone?: string;
	parts?: EventPart[];
	public?: boolean;
	exception?: boolean;
	editId?: string;
	seriesOrder?: number;
	seriesDate?: string;
	seasonId?: string;
	id: string;
	title: string;
	date: string;
	endDate?: string;
	responseDeadline?: string;
	tournamentRoster?: { personId: string; team: string }[];
	start: string;
	end: string;
	venue: string;
	program: string;
	kind: "training" | "hockey" | "social" | "tournament" | "meeting";
	signup: "open" | "scheduled" | "closed";
	repeatInterval?: number;
	repeatUntil?: string;
	registrationOpen?: { weeksBefore: number; weekday: number; time: string };
	registrationCloseHours?: number;
	capacity?: number;
	description: string;
	cancelled: boolean;
	seriesId?: string;
	opensAt?: number;
	closesAt?: number;
	eligiblePersonIds?: string[];
	repeat?: EventDraft["repeat"];
	signupOpens?: EventDraft["signupOpens"];
	signupCloses?: EventDraft["signupCloses"];
};
export type EventResponse = {
	declinedPartIds?: string[];
	seriesExpected?: boolean;
	seriesInvitedAt?: number;
	absenceReason?: string;
	partIds?: string[];
	partAttendance?: { partId: string; attendance: Attendance }[];
	eventId: string;
	personId: string;
	response: Response | "waiting";
	attendance: Attendance;
};
export type TeamPlan = {
	draftLineup?: LineupSnapshot;
	captains?: { side: "black" | "white"; personId: string }[];
	revision?: number;
	fieldSlots?: { personId: string; slot: number }[];
	rotationSlots?: { personId: string; slot: number }[];
	referees?: { side: "black" | "white"; personId: string }[];
	blackFormation?: TeamFormation;
	whiteFormation?: TeamFormation;
	blackBench?: string[];
	whiteBench?: string[];
	partId?: string;
	coachingStale?: boolean;
	separateYouth?: boolean;
	excludedPersonIds?: string[];
	assignments?: { personId: string; position: Position; ageGroup: AgeGroup }[];
	eventId: string;
	black: string[];
	white: string[];
	attendees: string[];
	published: boolean;
};
export type TeamFormation = "2-3-1" | "1-3-2" | "3-3";
export type CoachingFeedback = {
	authorName?: string;
	category?: ShoutoutCategory;
	id: string;
	kind?: "coaching" | "shoutout";
	personId: string;
	authorId: string;
	eventId?: string;
	body: string;
	visibility: "draft" | "published" | "private";
	date: string;
};
export type Conversation = ChatAppearance & {
	participantPersonIds?: string[];
	kind?: "direct" | "group";
	eventId?: string;
	id: string;
	title: string;
	subtitle: string;
	accountIds: string[];
};
export type Message = {
	pollId?: string;
	createdAt?: number;
	id: string;
	threadId: string;
	accountId: string;
	author: string;
	body: string;
	time: string;
	images?: MessageImage[];
	reactions?: MessageReaction[];
	replyToId?: string;
	edited?: boolean;
	deleted?: boolean;
};
export type Notice = {
	id: string;
	postedAt?: number;
	title: string;
	body: string;
	program: string;
	date: string;
	acknowledgedBy: string[];
	dismissedBy?: string[];
	expiresAt?: string;
};
export type Equipment = {
	id: string;
	name: string;
	size: string;
	condition: "ready" | "repair";
	quantity?: number;
};
export type MemberLoan = {
	id: string;
	itemId: string;
	personId: string;
	borrower?: never;
	due: string;
	returned: boolean;
};
export type GuestLoan = {
	id: string;
	itemId: string;
	personId?: never;
	borrower: {
		kind: "guest";
		guestId: string;
		eventId: string;
		name: string;
		practiceTitle: string;
		practiceDate: string;
	};
	due: string;
	returned: boolean;
};
export type Loan = MemberLoan | GuestLoan;
export type Payment = {
	id: string;
	personId: string;
	amount: number;
	note: string;
};
export type Charge = { personId: string; amount: number };
export type Tracker = {
	id: string;
	name: string;
	program: string;
	kind: "check" | "text" | "date";
};
export type AppData = {
	programs?: ClubProgram[];
	timeZone?: string;
	playerCoaching?: PlayerCoaching[];
	seasons: Season[];
	clubName: string;
	venues?: string[];
	members: Member[];
	events: ClubEvent[];
	responses: EventResponse[];
	teams: TeamPlan[];
	plans: Record<string, string>;
	feedback: CoachingFeedback[];
	conversations: Conversation[];
	messages: Message[];
	notices: Notice[];
	equipment: Equipment[];
	loans: Loan[];
	charges: Charge[];
	payments: Payment[];
	paymentTotals?: Record<string, number>;
	trackers: Tracker[];
	trackerValues: Record<string, string>;
	reminders: boolean;
};
export type EventDraft = {
	programRsvp?: ProgramRsvp;
	committedRoster?: boolean;
	seriesWaitlist?: boolean;
	excludedDates?: string[];
	timeZone?: string;
	parts?: EventPart[];
	public?: boolean;
	rebuild?: boolean;
	seasonId?: string;
	title: string;
	date: string;
	endDate?: string;
	responseDeadline?: string;
	tournamentRoster?: { personId: string; team: string }[];
	start: string;
	end: string;
	venue: string;
	program: string;
	kind: ClubEvent["kind"];
	repeatInterval?: number;
	repeatUntil?: string;
	registrationOpen?: { weeksBefore: number; weekday: number; time: string };
	registrationCloseHours?: number;
	capacity?: number;
	repeat: "once" | "daily" | "weekdays" | "weekly" | "fortnightly" | "monthly";
	occurrences?: number;
	eligiblePersonIds?: string[];
	signupOpens?: "now" | "three-days" | "week";
	signupCloses?: "start" | "hour" | "day";
	description: string;
};
export type AppAction =
	| { type: "delete-program"; id: string; expectedRevision: number }
	| {
			type: "save-program";
			requestId?: string;
			draft: ProgramDraft;
			expectedRevision: number;
			memberIds: string[];
	  }
	| { type: "set-member-archived"; personId: string; archived: boolean }
	| { type: "add-season"; season: Season }
	| { type: "add-member"; member: Member; charge: number }
	| {
			type: "respond";
			declinedPartIds?: string[];
			eventId: string;
			personId: string;
			response: Response;
			partIds?: string[];
	  }
	| {
			type: "attendance";
			lateAddition?: boolean;
			partId?: string;
			eventId: string;
			personId: string;
			attendance: Attendance;
	  }
	| { type: "create-event"; id: string; draft: EventDraft }
	| {
			type: "edit-event";
			eventId: string;
			draft: EventDraft;
			scope: "single" | "series" | "following";
			editId?: string;
	  }
	| { type: "cancel-event"; eventId: string }
	| {
			type: "generate-teams";
			expectedRevision?: number;
			partId?: string;
			eventId: string;
			separateYouth?: boolean;
			excludedPersonIds?: string[];
	  }
	| {
			type: "assign-position";
			expectedRevision?: number;
			partId?: string;
			eventId: string;
			personId: string;
			position: Position;
	  }
	| {
			type: "move-player";
			partId?: string;
			eventId: string;
			personId: string;
			expectedRevision?: number;
	  }
	| {
			type: "publish-teams";
			partId?: string;
			eventId: string;
			expectedRevision?: number;
	  }
	| {
			type: "save-lineup";
			privateDraft?: boolean;
			partId?: string;
			eventId: string;
			expectedRevision: number;
			snapshot: LineupSnapshot;
	  }
	| {
			type: "carry-lineup";
			eventId: string;
			partId?: string;
			sourceEventId: string;
			sourcePartId?: string;
			expectedSourceRevision: number;
			expectedRevision: number;
	  }
	| { type: "save-plan"; partId?: string; eventId: string; body: string }
	| { type: "save-feedback"; feedback: CoachingFeedback }
	| { type: "publish-feedback"; id: string }
	| { type: "delete-feedback"; id: string }
	| { type: "goal-step"; personId: string; delta: number }
	| {
			type: "set-goal";
			personId: string;
			goal: string;
			details?: GoalDetails;
			expectedRevision?: number;
	  }
	| {
			type: "request-goal";
			expectedPendingRevision?: number;
			personId: string;
			goal: string;
			details?: GoalDetails;
			expectedRevision?: number;
	  }
	| {
			type: "review-goal";
			personId: string;
			goal: string;
			approve: boolean;
			requestRevision?: number;
	  }
	| {
			type: "send-message";
			id: string;
			threadId: string;
			body: string;
			time: string;
			images?: MessageImage[];
			replyToId?: string;
	  }
	| { type: "edit-message"; messageId: string; body: string }
	| { type: "delete-message"; messageId: string }
	| { type: "set-reaction"; messageId: string; emoji: string; active: boolean }
	| { type: "create-thread"; id: string; title: string; recipientId: string }
	| { type: "dismiss-notice"; noticeId: string }
	| { type: "expire-notice"; noticeId: string }
	| {
			type: "edit-notice";
			noticeId: string;
			body: string;
			expiresAt?: string;
			expectedBody: string;
			expectedExpiresAt?: string;
	  }
	| { type: "create-notice"; notice: Notice }
	| { type: "registration"; personId: string; status: Member["registration"] }
	| { type: "payment"; payment: Payment }
	| { type: "issue"; loan: MemberLoan }
	| { type: "return"; loanId: string }
	| { type: "add-equipment"; equipment: Equipment }
	| { type: "update-equipment"; equipment: Equipment }
	| { type: "add-tracker"; tracker: Tracker }
	| {
			type: "tracker-value";
			trackerId: string;
			personId: string;
			value: string;
	  }
	| {
			type: "settings";
			clubName: string;
			venues?: string[];
			reminders: boolean;
			timeZone?: string;
	  };
