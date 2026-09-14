import type { ClubEvent, EventResponse } from "./app-types";
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
export const seriesEvents = (
	series: SessionSeries,
	events: ClubEvent[],
): ClubEvent[] =>
	events
		.filter(
			(event) => event.seriesId && series.seriesIds.includes(event.seriesId),
		)
		.toSorted((a, b) => a.date.localeCompare(b.date));
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
export const syncSeriesResponses = (
	series: SessionSeries,
	events: ClubEvent[],
	responses: EventResponse[],
	today: string,
	now?: number,
): EventResponse[] => {
	const activationTime = now ?? Date.now();
	const sessions = seriesEvents(series, events).filter(
		(event) =>
			!event.cancelled &&
			event.date >= today &&
			(now === undefined ||
				clubTimestamp(event.date, event.end, event.timeZone) > now),
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
			const expected = series.enrollments.some(
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
