import type { ClubEvent } from "./app-types";
import { eventFinished } from "./schedule-agenda";

export const weekdayLabels = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;
export const eventWeekday = (event: Pick<ClubEvent, "date">): number =>
	new Date(`${event.date}T12:00:00Z`).getUTCDay();
export const scheduledWeekdays = (
	events: readonly ClubEvent[],
	now: number,
): number[] =>
	[
		...new Set(
			events
				.filter((event) => !event.cancelled && !eventFinished(event, now))
				.map(eventWeekday),
		),
	].sort((a, b) => a - b);
