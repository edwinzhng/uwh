import type { Attendance, Response } from "./club";
import type { MessageImage, MessageReaction } from "./messaging";
import type { AgeGroup, PlayerCoaching, Position } from "./player-coaching";

export type Season = { id: string; name: string; start: string; end: string };
export type Account = {
	id: string;
	personId: string;
	name: string;
	children: string[];
	coachPrograms: string[];
	admin: boolean;
};
export type Member = {
	id: string;
	name: string;
	programs: string[];
	position: string;
	rating: number;
	registration: "missing" | "submitted" | "approved";
	goal: string;
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
	start: string;
	end: string;
	venue: string;
	program: string;
	kind: "training" | "hockey" | "social";
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
	partIds?: string[];
	partAttendance?: { partId: string; attendance: Attendance }[];
	eventId: string;
	personId: string;
	response: Response | "waiting";
	attendance: Attendance;
};
export type TeamPlan = {
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
export type CoachingFeedback = {
	id: string;
	personId: string;
	authorId: string;
	body: string;
	visibility: "draft" | "published" | "private";
	date: string;
};
export type Conversation = {
	id: string;
	title: string;
	subtitle: string;
	accountIds: string[];
};
export type Message = {
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
	title: string;
	body: string;
	program: string;
	date: string;
	acknowledgedBy: string[];
};
export type Equipment = {
	id: string;
	name: string;
	size: string;
	condition: "ready" | "repair";
	quantity?: number;
};
export type Loan = {
	id: string;
	itemId: string;
	personId: string;
	due: string;
	returned: boolean;
};
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
	timeZone?: string;
	parts?: EventPart[];
	public?: boolean;
	rebuild?: boolean;
	seasonId?: string;
	title: string;
	date: string;
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
	| { type: "add-season"; season: Season }
	| { type: "add-member"; member: Member; charge: number }
	| {
			type: "respond";
			eventId: string;
			personId: string;
			response: Response;
			partIds?: string[];
	  }
	| {
			type: "attendance";
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
			partId?: string;
			eventId: string;
			separateYouth?: boolean;
			excludedPersonIds?: string[];
	  }
	| {
			type: "assign-position";
			partId?: string;
			eventId: string;
			personId: string;
			position: Position;
	  }
	| { type: "move-player"; partId?: string; eventId: string; personId: string }
	| { type: "publish-teams"; partId?: string; eventId: string }
	| { type: "save-plan"; partId?: string; eventId: string; body: string }
	| { type: "save-feedback"; feedback: CoachingFeedback }
	| { type: "publish-feedback"; id: string }
	| { type: "delete-feedback"; id: string }
	| { type: "goal-step"; personId: string; delta: number }
	| { type: "set-goal"; personId: string; goal: string }
	| { type: "request-goal"; personId: string; goal: string }
	| { type: "review-goal"; personId: string; goal: string; approve: boolean }
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
	| { type: "acknowledge"; noticeId: string }
	| { type: "create-notice"; notice: Notice }
	| { type: "registration"; personId: string; status: Member["registration"] }
	| { type: "payment"; payment: Payment }
	| { type: "issue"; loan: Loan }
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
