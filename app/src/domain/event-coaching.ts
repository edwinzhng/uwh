import type { ClubEvent } from "./app-types";
import {
	type CoachingAssignment,
	type CoachingPractice,
	type CoachOption,
	coachingPartIds,
	coachingPartMinutes,
	completedCoachingEvent,
	practiceCoachingDuration,
	resolvedCoachingAssignment,
} from "./coaching-hours";
import {
	programCoachesFor,
	type WeeklyCoachingSchedule,
} from "./coaching-schedule";
import { defaultSeasonId } from "./seasons";

export const effectivePracticeCoaches = (
	event: ClubEvent,
	schedule: WeeklyCoachingSchedule,
	coaches: readonly CoachOption[],
	overrides: readonly CoachingAssignment[] | undefined,
	partId?: string,
): CoachingAssignment[] => {
	const assignments: readonly CoachingAssignment[] =
		overrides ??
		programCoachesFor(schedule, event.program).flatMap((id) => {
			const coach = coaches.find(
				(entry) =>
					entry.coachId === id && entry.programIds?.includes(event.program),
			);
			return coach
				? [
						{
							coachId: coach.coachId,
							personId: coach.personId,
							name: coach.name,
							durationMinutes: event.parts?.length
								? coachingPartMinutes(event)
								: practiceCoachingDuration(event),
						},
					]
				: [];
		});
	return assignments
		.filter(
			(assignment) =>
				!partId || coachingPartIds(event, assignment.partIds).includes(partId),
		)
		.map((assignment) => resolvedCoachingAssignment(event, assignment, partId))
		.filter((assignment) => assignment.durationMinutes > 0);
};

export const automaticCoachingPractices = (
	events: readonly ClubEvent[],
	schedule: WeeklyCoachingSchedule,
	coaches: readonly CoachOption[],
	overrides: Readonly<Record<string, CoachingAssignment[]>>,
	seasonId: string,
	now: number,
): CoachingPractice[] =>
	events
		.filter(
			(event) =>
				(event.seasonId ?? defaultSeasonId) === seasonId &&
				completedCoachingEvent(event, now),
		)
		.map((event) => ({
			eventId: event.id,
			title: event.title,
			date: event.date,
			start: event.start,
			durationEditable: !event.parts?.length,
			practiceDurationMinutes: practiceCoachingDuration(event),
			coaches: effectivePracticeCoaches(
				event,
				schedule,
				coaches,
				overrides[event.id],
			),
		}))
		.filter((practice) => practice.coaches.length > 0)
		.sort(
			(left, right) =>
				right.date.localeCompare(left.date) ||
				right.start.localeCompare(left.start),
		);
