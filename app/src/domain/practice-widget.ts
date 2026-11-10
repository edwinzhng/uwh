import { canManagePerson, canRegister, eventResponse } from "./app-rules";
import type { Account, AppData, EventResponse } from "./app-types";
import { eventDateParts, eventTimeRange } from "./event-card-presentation";
import { clubTimestamp, signupState } from "./event-time";
import { practiceEvent } from "./event-types";
import type { HomeLineupAssignment } from "./home-lineup";
import { changedPartResponse, partResponse } from "./schedule-agenda";
import { venueName } from "./venue";

export type PracticeWidgetSnapshot =
	| { kind: "unavailable" }
	| { kind: "empty"; personName: string }
	| {
			kind: "practice";
			personName: string;
			eventId: string;
			title: string;
			date: string;
			time: string;
			venue: string;
			signup: "open" | "scheduled" | "closed";
			parts: {
				id?: string;
				title: string;
				time: string;
				response: EventResponse["response"];
			}[];
			personId: string;
			seriesExpected: boolean;
			lineupLoaded: boolean;
			assignments: HomeLineupAssignment[];
			endsAt: number;
			updatedAt: number;
	  };

export const practiceWidgetSnapshot = (
	data: AppData,
	account: Account,
	personId: string,
	now: number,
	lineup?: { eventId: string; assignments: readonly HomeLineupAssignment[] },
): PracticeWidgetSnapshot => {
	if (!canManagePerson(account, personId)) return { kind: "unavailable" };
	const person = data.members.find(
		(member) =>
			member.id === personId && !member.archived && !member.mergedInto,
	);
	if (!person) return { kind: "unavailable" };
	const event = data.events
		.filter(
			(entry) =>
				!entry.cancelled &&
				practiceEvent(entry) &&
				canRegister(person, entry) &&
				clubTimestamp(
					entry.endDate ?? entry.date,
					entry.end,
					entry.timeZone ?? data.timeZone,
				) > now,
		)
		.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
		.at(0);
	if (!event) return { kind: "empty", personName: person.name };
	const timeZone = event.timeZone ?? data.timeZone;
	const response = eventResponse(data, event.id, personId);
	return {
		kind: "practice",
		personName: person.name,
		personId,
		seriesExpected: Boolean(response.seriesExpected),
		lineupLoaded: lineup?.eventId === event.id,
		eventId: event.id,
		title: event.title,
		date: event.date,
		time: eventTimeRange(event.start, event.end),
		venue: venueName(event.venue),
		signup: signupState(
			{ ...event, timeZone: event.timeZone ?? data.timeZone },
			now,
		),
		parts: event.parts?.length
			? event.parts.map((part) => ({
					id: part.id,
					title: part.title,
					time: eventTimeRange(part.start, part.end),
					response: partResponse(response, part.id),
				}))
			: [
					{
						title: "Practice",
						time: eventTimeRange(event.start, event.end),
						response: response.response,
					},
				],
		assignments:
			lineup?.eventId === event.id
				? lineup.assignments.filter((entry) => entry.personId === personId)
				: [],
		endsAt: clubTimestamp(event.endDate ?? event.date, event.end, timeZone),
		updatedAt: now,
	};
};

export type PracticeWidgetReply = "yes" | "no" | "waitlist" | "needed";

export type PracticeWidgetRow = {
	id: string;
	label: string;
	time: string;
	reply: PracticeWidgetReply;
	yes: string;
	no: string;
};

export type PracticeWidgetProps = {
	title: string;
	message: string;
	weekday: string;
	day: string;
	month: string;
	details: string;
	rows: PracticeWidgetRow[];
	lineup: string[];
	lineupNote: string;
	destination: string;
};

export type PracticeWidgetEntry = {
	timestamp: number;
	props: PracticeWidgetProps;
};

const emptyWidgetProps: PracticeWidgetProps = {
	title: "",
	message: "",
	weekday: "",
	day: "",
	month: "",
	details: "",
	rows: [],
	lineup: [],
	lineupNote: "",
	destination: "uwh-club://",
};

export const signedOutWidgetProps: PracticeWidgetProps = {
	...emptyWidgetProps,
	title: "Open UWH Club",
	message: "Sign in to see your next practice",
};

const widgetReplies = {
	going: "yes",
	unavailable: "no",
	waiting: "waitlist",
	unanswered: "needed",
} as const satisfies Record<EventResponse["response"], PracticeWidgetReply>;

const sessionLink = (params: Record<string, string>): string =>
	`uwh-club://session?${new URLSearchParams(params).toString()}`;

const lineupLabel = (
	assignment: HomeLineupAssignment,
	labelled: boolean,
): string => {
	const position = assignment.reserve
		? "Reserve"
		: (assignment.position
				?.replaceAll(" · ", " - ")
				.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()) ??
			"Position not set");
	return `${labelled && assignment.partName ? `${assignment.partName}: ` : ""}${assignment.team} Team · ${position}`;
};

const lineupLines = (assignments: HomeLineupAssignment[]): string[] => {
	const plain = [
		...new Set(assignments.map((entry) => lineupLabel(entry, false))),
	];
	return plain.length > 1
		? assignments.map((entry) => lineupLabel(entry, true))
		: plain;
};

export const practiceWidgetProps = (
	snapshot: PracticeWidgetSnapshot,
	replyKey: string,
): PracticeWidgetProps => {
	if (snapshot.kind === "unavailable") return signedOutWidgetProps;
	if (snapshot.kind === "empty")
		return {
			...emptyWidgetProps,
			title: "No upcoming practices",
			message: "New practices appear here",
		};
	const date = eventDateParts(snapshot.date);
	const canReply =
		snapshot.signup === "open" && !snapshot.seriesExpected && replyKey !== "";
	const replyLink = (going: boolean, partId: string | undefined): string =>
		sessionLink({
			event: snapshot.eventId,
			person: snapshot.personId,
			reply: going ? "yes" : "no",
			...(partId ? { replyPart: partId } : {}),
			widget: replyKey,
		});
	return {
		...emptyWidgetProps,
		title: snapshot.title,
		weekday: date.weekday.toUpperCase(),
		day: date.day,
		month: date.month.toUpperCase(),
		details: snapshot.venue,
		rows: snapshot.parts.map((part, index) => {
			const reply = widgetReplies[part.response];
			const buttons = canReply && reply === "needed";
			return {
				id: part.id ?? `part-${index}`,
				label: part.title,
				time: part.time,
				reply,
				yes: buttons ? replyLink(true, part.id) : "",
				no: buttons ? replyLink(false, part.id) : "",
			};
		}),
		lineup: lineupLines(snapshot.assignments),
		lineupNote:
			snapshot.lineupLoaded && snapshot.assignments.length === 0
				? "Teams not published yet"
				: "",
		destination: sessionLink({ event: snapshot.eventId }),
	};
};

const snapshotsFrom = (
	snapshotAt: (at: number) => PracticeWidgetSnapshot,
	at: number,
	remaining: number,
): { timestamp: number; snapshot: PracticeWidgetSnapshot }[] => {
	const snapshot = snapshotAt(at);
	const entry = { timestamp: at, snapshot };
	return snapshot.kind === "practice" && remaining > 1
		? [entry, ...snapshotsFrom(snapshotAt, snapshot.endsAt, remaining - 1)]
		: [entry];
};

export const practiceWidgetTimeline = (
	data: AppData,
	account: Account,
	personId: string,
	now: number,
	replyKey: string,
	lineup?: { eventId: string; assignments: readonly HomeLineupAssignment[] },
	length = 4,
): PracticeWidgetEntry[] =>
	snapshotsFrom(
		(at) => practiceWidgetSnapshot(data, account, personId, at, lineup),
		now,
		length,
	).map(({ timestamp, snapshot }) => ({
		timestamp,
		props: practiceWidgetProps(snapshot, replyKey),
	}));

export type WidgetReplyRequest = {
	eventId: string;
	personId: string;
	response: "going" | "unavailable" | "unanswered";
	partIds?: string[];
	declinedPartIds?: string[];
};

export const widgetReplyRequest = (
	params: Record<string, string | undefined>,
	replyKey: string,
	data: AppData,
	account: Account,
	now: number,
): WidgetReplyRequest | undefined => {
	const { event: eventId, person: personId, reply, replyPart } = params;
	if (
		replyKey === "" ||
		params.widget !== replyKey ||
		!eventId ||
		!personId ||
		(reply !== "yes" && reply !== "no")
	)
		return undefined;
	const snapshot = practiceWidgetSnapshot(data, account, personId, now);
	const event = data.events.find((entry) => entry.id === eventId);
	if (
		!event ||
		snapshot.kind !== "practice" ||
		snapshot.eventId !== eventId ||
		snapshot.signup !== "open" ||
		snapshot.seriesExpected
	)
		return undefined;
	const going = reply === "yes";
	const current = eventResponse(data, eventId, personId);
	if (!event.parts?.length)
		return replyPart
			? undefined
			: { eventId, personId, response: going ? "going" : "unavailable" };
	if (!replyPart || !event.parts.some((part) => part.id === replyPart))
		return undefined;
	return {
		eventId,
		personId,
		...changedPartResponse(event, current, replyPart, going),
	};
};
