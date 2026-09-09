import type { ClubEvent } from "./app-types";
import { clubTimestamp } from "./event-time";

export const coachingDurations = [60, 90, 120, 150, 180] as const;
export const validCoachingDuration = (minutes: number): boolean =>
	coachingDurations.some((duration) => duration === minutes);
export const defaultCoachingDuration = (date: string): number =>
	new Date(`${date}T12:00:00Z`).getUTCDay() === 5 ? 60 : 90;
export const coachingHoursLabel = (minutes: number): string =>
	`${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`;
export const completedCoachingEvent = (
	event: ClubEvent,
	now: number,
): boolean =>
	!event.cancelled &&
	event.kind !== "social" &&
	clubTimestamp(event.date, event.end) <= now;
export type CoachingAssignment = {
	coachId: string;
	personId: string;
	name: string;
	durationMinutes: number;
};
export type CoachingPractice = {
	eventId: string;
	title: string;
	date: string;
	start: string;
	coaches: CoachingAssignment[];
};
export type CoachingTotal = {
	coachId: string;
	name: string;
	minutes: number;
	practices: number;
};
export const coachingTotals = (
	practices: CoachingPractice[],
): CoachingTotal[] => {
	const coaches = new Map(
		practices.flatMap((practice) =>
			practice.coaches.map((coach) => [coach.coachId, coach] as const),
		),
	);
	return [...coaches.values()]
		.map((coach) => {
			const assignments = practices.flatMap((practice) =>
				practice.coaches.filter((entry) => entry.coachId === coach.coachId),
			);
			return {
				coachId: coach.coachId,
				name: coach.name,
				minutes: assignments.reduce(
					(sum, entry) => sum + entry.durationMinutes,
					0,
				),
				practices: assignments.length,
			};
		})
		.sort(
			(left, right) =>
				right.minutes - left.minutes || left.name.localeCompare(right.name),
		);
};
