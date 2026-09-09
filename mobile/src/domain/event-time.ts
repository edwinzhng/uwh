import { Temporal } from "@js-temporal/polyfill";
import type { ClubEvent, EventDraft } from "./app-types";

const permanentAlbertaTime = {
	date: "2026-03-09",
	instant: Date.parse("2026-03-09T06:00:00Z"),
	zone: "Etc/GMT+6",
} as const;
export const clubTimestamp = (date: string, time: string): number =>
	Temporal.ZonedDateTime.from(
		`${date}T${time}[${date >= permanentAlbertaTime.date ? permanentAlbertaTime.zone : "America/Edmonton"}]`,
		{
			disambiguation: "reject",
		},
	).epochMilliseconds;
export const clubDate = (timestamp = Date.now()): string =>
	Temporal.Instant.fromEpochMilliseconds(timestamp)
		.toZonedDateTimeISO(
			timestamp >= permanentAlbertaTime.instant
				? permanentAlbertaTime.zone
				: "America/Edmonton",
		)
		.toPlainDate()
		.toString();
export const signupState = (
	event: ClubEvent,
	now: number,
): ClubEvent["signup"] =>
	event.cancelled ||
	now >= (event.closesAt ?? clubTimestamp(event.date, event.start))
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
	const start = clubTimestamp(date, draft.start);
	const openHours =
		draft.signupOpens === "week"
			? 168
			: draft.signupOpens === "three-days"
				? 72
				: 0;
	const closeHours =
		draft.signupCloses === "day" ? 24 : draft.signupCloses === "hour" ? 1 : 0;
	return {
		opensAt: openHours ? start - openHours * 3600000 : now,
		closesAt: start - closeHours * 3600000,
	};
};
export const windowLabel = (timestamp: number): string =>
	new Intl.DateTimeFormat("en-CA", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZone:
			timestamp >= permanentAlbertaTime.instant
				? permanentAlbertaTime.zone
				: "America/Edmonton",
	}).format(timestamp);
