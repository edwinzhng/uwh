import type { ClubEvent } from "./app-types";

export type Countdown = {
	event: ClubEvent;
	days: number;
	underway: boolean;
};

const dayNumber = (date: string): number =>
	Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export const countdownLabel = ({ days, underway }: Countdown): string =>
	underway
		? "Happening now"
		: days === 0
			? "Today"
			: days === 1
				? "Tomorrow"
				: `${days} days`;

export const upcomingCountdowns = (
	events: readonly ClubEvent[],
	today: string,
	limit = 3,
): Countdown[] =>
	events
		.filter(
			(event) =>
				event.countdown &&
				!event.cancelled &&
				(event.endDate ?? event.date) >= today,
		)
		.toSorted((a, b) =>
			a.date === b.date
				? a.start.localeCompare(b.start)
				: a.date.localeCompare(b.date),
		)
		.filter(
			(event, index, sorted) =>
				!event.seriesId ||
				sorted.findIndex((entry) => entry.seriesId === event.seriesId) ===
					index,
		)
		.slice(0, limit)
		.map((event) => ({
			event,
			days: Math.max(0, dayNumber(event.date) - dayNumber(today)),
			underway: event.date < today,
		}));
