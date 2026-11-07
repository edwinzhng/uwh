import { type FitnessUnit, fitnessLowerIsBetter } from "./fitness";

export type FitnessRankingEntry = {
	personId: string;
	value: number;
	rank: number;
};

export const rankFitnessResults = (
	test: { unit: FitnessUnit; lowerIsBetter?: boolean },
	results: readonly { personId: string; value: number }[],
): FitnessRankingEntry[] => {
	if (test.unit === "pass_fail") return [];
	const lower = fitnessLowerIsBetter(test);
	const best = results
		.filter((result) => Number.isFinite(result.value))
		.reduce((values, result) => {
			const previous = values.get(result.personId);
			if (
				previous === undefined ||
				(lower ? result.value < previous : result.value > previous)
			)
				values.set(result.personId, result.value);
			return values;
		}, new Map<string, number>());
	const sorted = Array.from(best, ([personId, value]) => ({
		personId,
		value,
	})).sort(
		(left, right) =>
			(lower ? left.value - right.value : right.value - left.value) ||
			left.personId.localeCompare(right.personId),
	);
	return sorted.map((entry) => ({
		...entry,
		rank: sorted.findIndex((other) => other.value === entry.value) + 1,
	}));
};
