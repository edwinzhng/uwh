import { Temporal } from "@js-temporal/polyfill";
import type { ClubEvent, EventDraft } from "./app-types";
import { canonicalTimeZone, defaultClubTimeZone } from "./time-zones";

const permanentAlbertaTime = {
	date: "2026-03-09",
	instant: Date.parse("2026-03-09T06:00:00Z"),
	zone: "Etc/GMT+6",
} as const;
const effectiveTimeZone = (date: string, timeZone: string): string =>
	canonicalTimeZone(timeZone) === defaultClubTimeZone &&
	date >= permanentAlbertaTime.date
		? permanentAlbertaTime.zone
		: timeZone;
export const clubTimestamp = (
	date: string,
	time: string,
	timeZone = defaultClubTimeZone,
): number =>
	Temporal.ZonedDateTime.from(
		`${date}T${time}[${effectiveTimeZone(date, timeZone)}]`,
		{ disambiguation: "reject" },
	).epochMilliseconds;
export const clubDate = (
	timestamp = Date.now(),
	timeZone = defaultClubTimeZone,
): string =>
	Temporal.Instant.fromEpochMilliseconds(timestamp)
		.toZonedDateTimeISO(
			canonicalTimeZone(timeZone) === defaultClubTimeZone &&
				timestamp >= permanentAlbertaTime.instant
				? permanentAlbertaTime.zone
				: timeZone,
		)
		.toPlainDate()
		.toString();
export const signupState = (
	event: ClubEvent,
	now: number,
): ClubEvent["signup"] =>
	event.cancelled ||
	now >=
		(event.closesAt ?? clubTimestamp(event.date, event.start, event.timeZone))
		? "closed"
		: event.opensAt !== undefined && now < event.opensAt
			? "scheduled"
			: event.opensAt !== undefined
				? "open"
				: event.signup;
export const signupWindow = (
	date: string,
	draft: EventDraft,
	now: number,
): { opensAt: number; closesAt: number } => {
	const start = clubTimestamp(date, draft.start, draft.timeZone);
	const openHours =
		draft.signupOpens === "week"
			? 168
			: draft.signupOpens === "three-days"
				? 72
				: 0;
	const closeHours =
		draft.registrationCloseHours ??
		(draft.signupCloses === "day" ? 24 : draft.signupCloses === "hour" ? 1 : 0);
	return {
		opensAt: draft.registrationOpen
			? clubTimestamp(
					Temporal.PlainDate.from(date)
						.subtract({ days: Temporal.PlainDate.from(date).dayOfWeek - 1 })
						.subtract({ weeks: draft.registrationOpen.weeksBefore })
						.add({ days: draft.registrationOpen.weekday - 1 })
						.toString(),
					draft.registrationOpen.time,
					draft.timeZone,
				)
			: openHours
				? start - openHours * 3600000
				: now,
		closesAt: draft.responseDeadline
			? Math.min(
					start,
					clubTimestamp(draft.responseDeadline, "23:59", draft.timeZone),
				)
			: start - closeHours * 3600000,
	};
};
export const windowLabel = (
	timestamp: number,
	timeZone = defaultClubTimeZone,
): string =>
	new Intl.DateTimeFormat("en-CA", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZone:
			canonicalTimeZone(timeZone) === defaultClubTimeZone &&
			timestamp >= permanentAlbertaTime.instant
				? permanentAlbertaTime.zone
				: timeZone,
	}).format(timestamp);

export const eventDates = (
	event: Pick<ClubEvent, "date" | "endDate">,
): string[] => {
	const start = Temporal.PlainDate.from(event.date);
	const days =
		start.until(Temporal.PlainDate.from(event.endDate ?? event.date)).days + 1;
	return Array.from({ length: Math.min(14, Math.max(1, days)) }, (_, index) =>
		start.add({ days: index }).toString(),
	);
};
