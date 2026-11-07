import type { ClubEvent, EventResponse } from "./app-types";
import { clubAppOrigin } from "./calendar-links";
import { practiceRsvp, unansweredPracticeAbsent } from "./effective-attendance";
import { canRegister } from "./event-eligibility";
import { clubTimestamp, signupState } from "./event-time";
import { practiceEvent } from "./event-types";
import { attendanceForPart, practicePartKey } from "./practice-parts";

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
	url?: string;
	start: number;
	end: number;
	status: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
};
export type CalendarEntry = CalendarEvent & {
	uid: string;
	sequence: number;
	updatedAt: number;
};

export const calendarEventSlots = (
	event: ClubEvent,
	parts: NonNullable<ClubEvent["parts"]> = event.parts ?? [],
): Pick<CalendarEvent, "eventId" | "title" | "start" | "end">[] =>
	(parts.length ? parts : [undefined]).map((part) => ({
		eventId: practicePartKey(event.id, part?.id),
		title: part ? `${event.title} (${part.title})` : event.title,
		start: clubTimestamp(
			event.date,
			part?.start ?? event.start,
			event.timeZone,
		),
		end: clubTimestamp(
			part ? event.date : (event.endDate ?? event.date),
			part?.end ?? event.end,
			event.timeZone,
		),
	}));

export const calendarPendingWindow = 90 * 24 * 60 * 60 * 1000;

export const personalCalendarEvents = (
	events: ClubEvent[],
	responses: EventResponse[],
	personId: string,
	programs: string[],
	includeWaitlisted: boolean,
	now = Date.now(),
): CalendarEvent[] => {
	const byEvent = new Map(
		responses
			.filter((entry) => entry.personId === personId)
			.map((entry) => [entry.eventId, entry]),
	);
	return events
		.flatMap((event): CalendarEvent[] => {
			const response = byEvent.get(event.id);
			if (
				event.cancelled ||
				!canRegister({ id: personId, programs }, event) ||
				response?.response === "unavailable"
			)
				return [];
			const signup = signupState(event, now);
			const startsAt = clubTimestamp(event.date, event.start, event.timeZone);
			const pendingAllowed =
				practiceEvent(event) && startsAt <= now + calendarPendingWindow;
			const pendingLabel =
				signup === "scheduled"
					? "Signup not open yet"
					: signup === "closed"
						? "Signup closed"
						: "RSVP needed";
			const tournamentTeam = event.tournamentRoster?.find(
				(entry) => entry.personId === personId,
			)?.team;
			const provisional = event.kind === "tournament" && !tournamentTeam;
			const parts = event.parts?.length ? event.parts : [undefined];
			return parts.flatMap((part): CalendarEvent[] => {
				const answer = practiceRsvp(response, part?.id);
				const pending = answer === "unanswered";
				const marked = response
					? attendanceForPart(response, part?.id)
					: "unmarked";
				const attended = pending && (marked === "present" || marked === "late");
				const waitlisted = answer === "waiting";
				if (
					answer !== "going" &&
					!attended &&
					!(
						pending &&
						pendingAllowed &&
						marked !== "absent" &&
						!unansweredPracticeAbsent(event, now, response, part?.id)
					) &&
					!(waitlisted && includeWaitlisted)
				)
					return [];
				const url = `${clubAppOrigin}/session?${new URLSearchParams(part ? { event: event.id, part: part.id } : { event: event.id })}`;
				const description = [
					attended
						? "Attendance: Attended"
						: pending
							? pendingLabel
							: waitlisted
								? "RSVP: Waitlisted"
								: event.kind === "tournament"
									? `Availability: Available. Team: ${tournamentTeam ?? "Not assigned"}`
									: "RSVP: Going",
					event.description,
					`Open in UWH Club: ${url}`,
				]
					.filter(Boolean)
					.join("\n\n");
				return calendarEventSlots(event, part ? [part] : []).map((slot) => ({
					...slot,
					title:
						pending && !attended
							? `${pendingLabel} · ${slot.title}`
							: waitlisted
								? `Waitlisted · ${slot.title}`
								: slot.title,
					description,
					location: event.venue,
					url,
					status:
						(pending && !attended) || waitlisted || provisional
							? "TENTATIVE"
							: "CONFIRMED",
				}));
			});
		})
		.slice()
		.sort((a, b) => a.start - b.start || a.eventId.localeCompare(b.eventId));
};

export const calendarUid = (
	clubId: string,
	personId: string,
	eventId: string,
): string =>
	`${[clubId, personId, eventId].map(encodeURIComponent).join(".")}@uwhclub.app`;

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
			before.url === event.url &&
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
	return [...active, ...cancelled]
		.slice()
		.sort((a, b) => a.start - b.start || a.eventId.localeCompare(b.eventId));
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
		"PRODID:-//UWH Club//Personal Calendar//EN",
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
			...(entry.url && entry.status !== "CANCELLED"
				? [`URL:${entry.url}`]
				: []),
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
