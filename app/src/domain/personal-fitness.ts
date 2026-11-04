import { canReadProgress } from "./app-rules";
import type { Account, Member } from "./app-types";
import {
	type FitnessSummary,
	fitnessLowerIsBetter,
	formatFitnessValue,
} from "./fitness";
import {
	type FitnessResult,
	type FitnessState,
	type FitnessTest,
	fitnessSummary,
} from "./fitness-model";

export type PersonalFitnessRow = {
	test: FitnessTest;
	history: Pick<FitnessResult, "sessionId" | "date" | "value" | "notes">[];
	stats?: FitnessSummary;
	limited: boolean;
};

export const personalFitnessRows = (
	state: FitnessState,
	account: Account,
	person: Member,
	seasonId: string,
): PersonalFitnessRow[] => {
	if (!canReadProgress(account, person)) return [];
	return state.tests
		.map((test) => {
			const results = state.results
				.filter(
					(entry) =>
						entry.personId === person.id &&
						entry.testId === test._id &&
						entry.seasonId === seasonId,
				)
				.slice()
				.sort(
					(a, b) =>
						b.date.localeCompare(a.date) ||
						b.sessionId.localeCompare(a.sessionId),
				);
			return {
				test,
				history: results.slice(0, 100),
				stats: fitnessSummary(test.unit, results, fitnessLowerIsBetter(test)),
				limited: results.length > 100,
			};
		})
		.filter((row) => row.history.length > 0);
};

export const fitnessChange = (
	row: PersonalFitnessRow,
):
	| {
			value: string;
			direction: "up" | "down" | "equal";
			improved: boolean;
	  }
	| undefined => {
	const latest = row.history.at(0);
	const previous = row.history.at(1);
	if (!latest || !previous || row.test.unit === "pass_fail") return;
	const delta = latest.value - previous.value;
	return {
		value: `${formatFitnessValue(row.test.unit, Math.abs(delta))}${row.test.unit === "distance" ? " m" : ""}`,
		direction: delta === 0 ? "equal" : delta > 0 ? "up" : "down",
		improved: fitnessLowerIsBetter(row.test) ? delta < 0 : delta > 0,
	};
};

export const latestIsPersonalBest = (row: PersonalFitnessRow): boolean => {
	const latest = row.history.at(0);
	return (
		row.test.unit !== "pass_fail" &&
		latest !== undefined &&
		row.stats?.best !== undefined &&
		latest.value === row.stats.best
	);
};
