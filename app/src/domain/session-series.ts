import type { ClubEvent, EventResponse, Member } from "./app-types";
import { canRegister } from "./event-eligibility";
import { clubTimestamp } from "./event-time";

export type SeriesEnrollment = {
	personId: string;
	start: string;
	end?: string;
	state: "committed" | "waiting" | "invited";
};
export type SessionSeries = {
	id: string;
	seriesIds: string[];
	title: string;
	capacity?: number;
	waitlist?: boolean;
	enrollments: SeriesEnrollment[];
};
export const enrollmentApplies = (
	enrollment: SeriesEnrollment,
	date: string,
): boolean =>
	enrollment.state === "committed" &&
	enrollment.start <= date &&
	(!enrollment.end || date < enrollment.end);
export const currentSeriesEnrollment = (
	series: SessionSeries,
	personId: string,
	today: string,
): SeriesEnrollment | undefined =>
	series.enrollments.find(
		(entry) =>
			entry.personId === personId &&
			(!entry.end || (entry.end > today && entry.end > entry.start)),
	);
export const seriesEvents = (
	series: SessionSeries,
	events: ClubEvent[],
): ClubEvent[] =>
	events
		.filter(
			(event) => event.seriesId && series.seriesIds.includes(event.seriesId),
		)
		.slice()
		.sort((a, b) => a.date.localeCompare(b.date));
export const seriesHasSpace = (
	series: SessionSeries,
	start: string,
	end?: string,
	personId?: string,
): boolean => {
	const committed = series.enrollments.filter(
		(entry) =>
			entry.state === "committed" &&
			entry.personId !== personId &&
			(!entry.end || entry.end > start) &&
			(!end || entry.start < end),
	);
	const boundaries = [
		start,
		...committed
			.map((entry) => entry.start)
			.filter((date) => date >= start && (!end || date < end)),
	];
	return boundaries.every(
		(date) =>
			committed.filter((entry) => enrollmentApplies(entry, date)).length <
			(series.capacity ?? Infinity),
	);
};
export const reconcileSeriesEligibility = (
	series: SessionSeries,
	events: ClubEvent[],
	members: readonly Member[],
	today: string,
	now: number,
): SessionSeries => ({
	...series,
	enrollments: series.enrollments.map((entry) => {
		const person = members.find((member) => member.id === entry.personId);
		const losesFutureEligibility = seriesEvents(series, events).some(
			(event) =>
				!event.cancelled &&
				event.date >= entry.start &&
				(!entry.end || event.date < entry.end) &&
				clubTimestamp(event.date, event.start, event.timeZone) > now &&
				(!person ||
					person.archived ||
					person.mergedInto ||
					(event.programRsvp &&
						event.program !== "all" &&
						!person.programs.includes(event.program) &&
						!event.eligiblePersonIds?.includes(person.id))),
		);
		return losesFutureEligibility && (!entry.end || entry.end > today)
			? { ...entry, end: entry.start > today ? entry.start : today }
			: entry;
	}),
});
export const syncSeriesResponses = (
	series: SessionSeries,
	events: ClubEvent[],
	responses: EventResponse[],
	today: string,
	now?: number,
	excludedPersonIds: string[] = [],
	members?: readonly Member[],
): EventResponse[] => {
	const activationTime = now ?? Date.now();
	const sessions = seriesEvents(series, events).filter(
		(event) =>
			!event.cancelled &&
			event.date >= today &&
			(now === undefined ||
				clubTimestamp(event.date, event.start, event.timeZone) > now),
	);
	return sessions.reduce<EventResponse[]>((current, event) => {
		const people = [
			...new Set([
				...series.enrollments.map((entry) => entry.personId),
				...current
					.filter(
						(response) =>
							response.eventId === event.id && response.seriesExpected,
					)
					.map((response) => response.personId),
			]),
		];
		return people.reduce<EventResponse[]>((result, personId) => {
			const existing = result.find(
				(response) =>
					response.eventId === event.id && response.personId === personId,
			);
			const expected =
				!excludedPersonIds.includes(personId) &&
				(members === undefined ||
					members.some(
						(member) => member.id === personId && canRegister(member, event),
					)) &&
				series.enrollments.some(
					(entry) =>
						entry.personId === personId &&
						enrollmentApplies(entry, event.date) &&
						(!event.eligiblePersonIds ||
							event.eligiblePersonIds.includes(personId)),
				);
			if (!expected && !existing?.seriesExpected) return result;
			const opened =
				event.opensAt === undefined
					? event.signup !== "scheduled"
					: event.opensAt <= activationTime;
			const activated = expected && opened;
			const response: EventResponse = {
				...existing,
				eventId: event.id,
				personId,
				seriesExpected: expected || undefined,
				declinedPartIds:
					expected && !existing?.seriesExpected
						? undefined
						: existing?.declinedPartIds,
				seriesInvitedAt: activated
					? (existing?.seriesInvitedAt ?? activationTime)
					: existing?.seriesInvitedAt,
				response: expected
					? existing?.response === "unavailable" && existing.seriesExpected
						? "unavailable"
						: activated
							? "going"
							: existing?.seriesExpected && existing.response === "going"
								? "going"
								: "unanswered"
					: existing?.response === "going"
						? "unanswered"
						: (existing?.response ?? "unanswered"),
				attendance: existing?.attendance ?? "unmarked",
			};
			return [
				...result.filter(
					(entry) =>
						!(entry.eventId === event.id && entry.personId === personId),
				),
				response,
			];
		}, current);
	}, responses);
};
