import type { Account } from "./app-types";
import { type CoachOption, maxPracticeCoaches } from "./coaching-hours";

export const coachingWeekdays = [
	{ value: "monday", label: "Monday" },
	{ value: "tuesday", label: "Tuesday" },
	{ value: "wednesday", label: "Wednesday" },
	{ value: "thursday", label: "Thursday" },
	{ value: "friday", label: "Friday" },
	{ value: "saturday", label: "Saturday" },
	{ value: "sunday", label: "Sunday" },
] as const;
export type CoachingWeekday = (typeof coachingWeekdays)[number]["value"];
export type WeeklyCoachingSchedule = {
	programs?: { programId: string; coachIds: string[] }[];
	days: { weekday: CoachingWeekday; coachIds: string[] }[];
	backupCoachIds: string[];
	revision: number;
};
export const emptyCoachingSchedule = (): WeeklyCoachingSchedule => ({
	programs: [],
	days: coachingWeekdays.map(({ value }) => ({ weekday: value, coachIds: [] })),
	backupCoachIds: [],
	revision: 0,
});
export const coachingWeekday = (date: string): CoachingWeekday =>
	(
		[
			"sunday",
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday",
		] as const
	).at(new Date(`${date}T12:00:00Z`).getUTCDay()) ?? "monday";
export const weeklyCoachesFor = (
	schedule: WeeklyCoachingSchedule,
	date: string,
): string[] =>
	schedule.days.find((day) => day.weekday === coachingWeekday(date))
		?.coachIds ?? [];
export const validateCoachingSchedule = (
	schedule: WeeklyCoachingSchedule,
): string | undefined => {
	if (
		(schedule.programs?.length ?? 0) > 100 ||
		new Set(schedule.programs?.map((entry) => entry.programId)).size !==
			(schedule.programs?.length ?? 0)
	)
		return "Choose distinct programs";
	if (
		schedule.programs?.some(
			(entry) =>
				!entry.programId.trim() ||
				entry.coachIds.length > maxPracticeCoaches ||
				new Set(entry.coachIds).size !== entry.coachIds.length,
		)
	)
		return "Choose up to 3 different coaches per program";
	if (
		schedule.days.length !== 7 ||
		new Set(schedule.days.map((day) => day.weekday)).size !== 7
	)
		return "Set a roster for each day";
	if (schedule.days.some((day) => day.coachIds.length > 8))
		return "Choose up to 8 coaches per day";
	if (
		schedule.days.some(
			(day) => new Set(day.coachIds).size !== day.coachIds.length,
		)
	)
		return "Choose different coaches";
	if (schedule.backupCoachIds.length > 16)
		return "Choose up to 16 backup coaches";
	if (new Set(schedule.backupCoachIds).size !== schedule.backupCoachIds.length)
		return "Choose different backup coaches";
	return undefined;
};

export const programCoachesFor = (
	schedule: WeeklyCoachingSchedule,
	programId: string,
): string[] =>
	schedule.programs?.find((entry) => entry.programId === programId)?.coachIds ??
	[];

export const changedCoachingPrograms = (
	previous: WeeklyCoachingSchedule,
	next: WeeklyCoachingSchedule,
): string[] =>
	next.programs === undefined
		? []
		: [
				...new Set([
					...(previous.programs ?? []).map((entry) => entry.programId),
					...next.programs.map((entry) => entry.programId),
				]),
			].filter((programId) => {
				const before = programCoachesFor(previous, programId);
				const after = programCoachesFor(next, programId);
				return (
					before.length !== after.length ||
					before.some((id) => !after.includes(id))
				);
			});

export const validateProgramCoaching = (
	previous: WeeklyCoachingSchedule,
	next: WeeklyCoachingSchedule,
	actor: Pick<Account, "admin" | "coachPrograms">,
	programs: { id: string; archived: boolean }[],
	coaches: CoachOption[],
): string | undefined => {
	const changed = changedCoachingPrograms(previous, next);
	if (
		changed.some(
			(programId) => !actor.admin && !actor.coachPrograms.includes(programId),
		)
	)
		return "You can only assign coaches for your programs.";
	if (
		changed.some(
			(programId) =>
				programCoachesFor(next, programId).length &&
				!programs.some(
					(program) => program.id === programId && !program.archived,
				),
		)
	)
		return "Choose an active program from this club.";
	if (
		changed.some((programId) =>
			programCoachesFor(next, programId).some(
				(id) =>
					!coaches.some(
						(coach) =>
							coach.coachId === id && coach.programIds?.includes(programId),
					),
			),
		)
	)
		return "Choose coaches with access to this program.";
	if (
		next.backupCoachIds.some(
			(id) => !coaches.some((coach) => coach.coachId === id),
		)
	)
		return "Choose active coaches from this club.";
	return undefined;
};
