import {
	type CoachingPractice,
	type CoachingTotal,
	type CoachOption,
	coachingTotals,
} from "../domain/coaching-hours";

export const coachingReportTotals = (
	practices: CoachingPractice[],
	coaches: CoachOption[],
): CoachingTotal[] =>
	[
		...new Map([
			...coaches.map((coach): [string, CoachingTotal] => [
				coach.coachId,
				{ coachId: coach.coachId, name: coach.name, minutes: 0, practices: 0 },
			]),
			...coachingTotals(practices).map((total): [string, CoachingTotal] => [
				total.coachId,
				total,
			]),
		]).values(),
	].sort((left, right) => left.name.localeCompare(right.name));
