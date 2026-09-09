import type { ClubEvent, EventResponse } from "./app-types";
import { clubTimestamp } from "./event-time";
import { selectedParts } from "./practice-parts";

export const calendarPartDescription = (
	event: ClubEvent,
	response: Pick<EventResponse, "partIds"> = {},
): string =>
	selectedParts(event, response)
		.map((part) => `${part.title}: ${part.start}–${part.end}`)
		.join("\n");

export type CalendarFeedInfo = {
	personId: string;
	token: string;
	includeWaitlisted: boolean;
};
export type CalendarEvent = {
	eventId: string;
	title: string;
	description: string;
	location: string;
	start: number;
	end: number;
	status: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
};
export type CalendarEntry = CalendarEvent & {
	uid: string;
	sequence: number;
	updatedAt: number;
};

export const personalCalendarEvents = (
	events: ClubEvent[],
	responses: EventResponse[],
	personId: string,
	programs: string[],
	includeWaitlisted: boolean,
): CalendarEvent[] => {
	const byEvent = new Map(
		responses
			.filter((entry) => entry.personId === personId)
			.map((entry) => [entry.eventId, entry]),
	);
	return events
		.flatMap((event): CalendarEvent[] => {
			const response = byEvent.get(event.id);
			const parts = selectedParts(event, response ?? {});
			if (
				event.cancelled ||
				!programs.length ||
				(event.eligiblePersonIds !== undefined &&
					!event.eligiblePersonIds.includes(personId)) ||
				(response?.response !== "going" &&
					!(includeWaitlisted && response?.response === "waiting")) ||
				Boolean(event.parts?.length && !parts.length)
			)
				return [];
			const waitlisted = response?.response === "waiting";
			const start = parts.length
				? parts.reduce(
						(time, part) => (part.start < time ? part.start : time),
						parts.at(0)?.start ?? event.start,
					)
				: event.start;
			const end = parts.length
				? parts.reduce(
						(time, part) => (part.end > time ? part.end : time),
						parts.at(0)?.end ?? event.end,
					)
				: event.end;
			return [
				{
					eventId: event.id,
					title: waitlisted ? `Waitlisted · ${event.title}` : event.title,
					description: [
						waitlisted ? "RSVP: Waitlisted" : "RSVP: Going",
						calendarPartDescription(event, response),
						event.description,
					]
						.filter(Boolean)
						.join("\n\n"),
					location: event.venue,
					start: clubTimestamp(event.date, start, event.timeZone),
					end: clubTimestamp(event.date, end, event.timeZone),
					status: waitlisted ? "TENTATIVE" : "CONFIRMED",
				},
			];
		})
		.toSorted(
			(a, b) => a.start - b.start || a.eventId.localeCompare(b.eventId),
		);
};

export const calendarUid = (
	clubId: string,
	personId: string,
	eventId: string,
): string =>
	`${[clubId, personId, eventId].map(encodeURIComponent).join(".")}@crocs.club`;

export const reconcileCalendar = (
	previous: CalendarEntry[],
	current: CalendarEvent[],
	clubId: string,
	personId: string,
	now: number,
): CalendarEntry[] => {
	const previousByEvent = new Map(
		previous.map((entry) => [entry.eventId, entry]),
	);
	const currentIds = new Set(current.map((entry) => entry.eventId));
	const active = current.map((event): CalendarEntry => {
		const before = previousByEvent.get(event.eventId);
		const unchanged =
			before &&
			before.title === event.title &&
			before.description === event.description &&
			before.location === event.location &&
			before.start === event.start &&
			before.end === event.end &&
			before.status === event.status;
		return unchanged
			? before
			: {
					...event,
					uid: before?.uid ?? calendarUid(clubId, personId, event.eventId),
					sequence: before ? before.sequence + 1 : 0,
					updatedAt: now,
				};
	});
	const cancelled = previous
		.filter((entry) => !currentIds.has(entry.eventId))
		.map(
			(entry): CalendarEntry =>
				entry.status === "CANCELLED"
					? entry
					: {
							...entry,
							status: "CANCELLED",
							description: "Removed from your calendar.",
							sequence: entry.sequence + 1,
							updatedAt: now,
						},
		);
	return [...active, ...cancelled].toSorted(
		(a, b) => a.start - b.start || a.eventId.localeCompare(b.eventId),
	);
};

const escapeText = (value: string): string =>
	value
		.replaceAll("\\", "\\\\")
		.replace(/\r\n|\r|\n/g, "\\n")
		.replaceAll(";", "\\;")
		.replaceAll(",", "\\,");
export const foldCalendarLine = (value: string): string => {
	const encoder = new TextEncoder();
	const lines: string[] = [];
	const line = { value: "", bytes: 0 };
	for (const char of value) {
		const bytes = encoder.encode(char).length;
		if (line.bytes + bytes > 75) {
			lines.push(line.value);
			line.value = " ";
			line.bytes = 1;
		}
		line.value += char;
		line.bytes += bytes;
	}
	return [...lines, line.value].join("\r\n");
};
const calendarTime = (time: number): string =>
	new Date(time)
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}Z$/, "Z");

export const renderCalendar = (
	name: string,
	entries: CalendarEntry[],
	visibility: "PUBLIC" | "PRIVATE" = "PRIVATE",
): string =>
	[
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Crocs Club//Personal Calendar//EN",
		"CALSCALE:GREGORIAN",
		`X-WR-CALNAME:${escapeText(name)}`,
		...entries.flatMap((entry) => [
			"BEGIN:VEVENT",
			`UID:${entry.uid}`,
			`DTSTAMP:${calendarTime(entry.updatedAt)}`,
			`LAST-MODIFIED:${calendarTime(entry.updatedAt)}`,
			`SEQUENCE:${entry.sequence}`,
			`DTSTART:${calendarTime(entry.start)}`,
			`DTEND:${calendarTime(entry.end)}`,
			`SUMMARY:${escapeText(entry.title)}`,
			`LOCATION:${escapeText(entry.location)}`,
			`DESCRIPTION:${escapeText(entry.description)}`,
			`STATUS:${entry.status}`,
			`TRANSP:${entry.status === "CONFIRMED" ? "OPAQUE" : "TRANSPARENT"}`,
			`CLASS:${visibility}`,
			"END:VEVENT",
		]),
		"END:VCALENDAR",
		"",
	]
		.map(foldCalendarLine)
		.join("\r\n");
