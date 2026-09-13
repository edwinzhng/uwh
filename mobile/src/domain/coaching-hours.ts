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
	clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <= now;
export type CoachingAssignment = {
	coachId: string;
	personId: string;
	name: string;
	durationMinutes: number;
	partIds?: string[];
};
export const coachingPartIds = (
	event: ClubEvent,
	assignedPartIds?: string[],
): string[] =>
	(event.parts ?? [])
		.filter((part) => !assignedPartIds || assignedPartIds.includes(part.id))
		.map((part) => part.id);
export const coachingPartMinutes = (
	event: ClubEvent,
	partIds?: string[],
): number => {
	const ranges = (event.parts ?? [])
		.filter((part) => !partIds || partIds.includes(part.id))
		.map((part) => ({
			start: clubTimestamp(event.date, part.start, event.timeZone),
			end: clubTimestamp(event.date, part.end, event.timeZone),
		}))
		.toSorted((left, right) => left.start - right.start);
	const merged = ranges.reduce<{ end: number; minutes: number }>(
		(total, range) => ({
			end: Math.max(total.end, range.end),
			minutes:
				total.minutes +
				Math.max(0, range.end - Math.max(total.end, range.start)) / 60000,
		}),
		{ end: 0, minutes: 0 },
	);
	return merged.minutes;
};
export const resolvedCoachingAssignment = (
	event: ClubEvent,
	assignment: CoachingAssignment,
	partId?: string,
): CoachingAssignment => ({
	...assignment,
	...(partId ? { partIds: [partId] } : {}),
	durationMinutes: event.parts?.length
		? coachingPartMinutes(event, partId ? [partId] : assignment.partIds)
		: assignment.durationMinutes,
});
export const updatedCoachingPartIds = (
	event: ClubEvent,
	existing: CoachingAssignment | undefined,
	assigned: boolean,
	partId?: string,
): string[] | undefined => {
	if (!partId) return assigned ? undefined : [];
	const current = existing ? coachingPartIds(event, existing.partIds) : [];
	return assigned
		? [...new Set([...current, partId])]
		: current.filter((id) => id !== partId);
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
