import type { ClubEvent } from "./app-types";
import { clubTimestamp } from "./event-time";

export const coachingDurations = [60, 90, 120, 150, 180] as const;
export const maxPracticeCoaches = 3;
export const canAssignPracticeCoach = (
	assignments: readonly Pick<CoachingAssignment, "coachId">[],
	coachId: string,
): boolean =>
	assignments.some((entry) => entry.coachId === coachId) ||
	new Set(assignments.map((entry) => entry.coachId)).size < maxPracticeCoaches;
export const validCoachingDuration = (minutes: number): boolean =>
	coachingDurations.some((duration) => duration === minutes);
export const defaultCoachingDuration = (date: string): number =>
	new Date(`${date}T12:00:00Z`).getUTCDay() === 5 ? 60 : 90;
export const coachingHoursLabel = (minutes: number): string =>
	minutes < 60
		? `${minutes} min`
		: `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`;

export const practiceCoachingDuration = (event: ClubEvent): number =>
	Math.max(
		1,
		Math.round(
			(clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) -
				clubTimestamp(event.date, event.start, event.timeZone)) /
				60000,
		),
	);
export const completedCoachingEvent = (
	event: ClubEvent,
	now: number,
): boolean =>
	!event.cancelled &&
	event.kind !== "social" &&
	event.kind !== "meeting" &&
	clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <= now;
export type CoachOption = {
	coachId: string;
	name: string;
	personId: string;
	programIds?: string[];
};
export type CoachingAssignment = {
	coachId: string;
	personId: string;
	name: string;
	durationMinutes: number;
	partIds?: string[];
};
export const coachingAssignmentSummary = (
	event: ClubEvent,
	assignment: CoachingAssignment,
): string =>
	[
		coachingHoursLabel(assignment.durationMinutes),
		...(event.parts ?? [])
			.filter(
				(part) => !assignment.partIds || assignment.partIds.includes(part.id),
			)
			.map((part) => part.title),
	].join(" · ");
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
		.slice()
		.sort((left, right) => left.start - right.start);
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
	durationEditable?: boolean;
	practiceDurationMinutes?: number;
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

export const coachingDurationEditError = (
	minutes: number,
	scheduledMinutes: number,
	savedMinutes: number,
	currentMinutes: number,
): string | undefined =>
	savedMinutes !== currentMinutes
		? "Coaching hours changed. Reload them before saving."
		: validCoachingDuration(minutes) || minutes === scheduledMinutes
			? undefined
			: "Choose coaching time";

export const coachingHoursCorrectionError = (
	assignments: readonly Pick<
		CoachingAssignment,
		"coachId" | "durationMinutes"
	>[],
	coachId: string,
	expectedDurationMinutes: number | undefined,
): string | undefined =>
	expectedDurationMinutes !== undefined &&
	assignments.find((assignment) => assignment.coachId === coachId)
		?.durationMinutes !== expectedDurationMinutes
		? "Coach assignment or hours changed. Reopen hours before saving."
		: undefined;
