import type { Member } from "./app-types";
import { type FitnessSummary, fitnessLowerIsBetter } from "./fitness";
import {
	type FitnessState,
	type FitnessTest,
	fitnessSummary,
} from "./fitness-model";

export type FitnessOverviewRow = {
	test: FitnessTest;
	personal?: FitnessSummary;
	latest?: { date: string; value: number };
	teamBest?: { name: string; value: number };
};

export const previewFitnessOverview = (
	state: FitnessState,
	members: Member[],
	seasonId: string,
	personId?: string,
): FitnessOverviewRow[] =>
	state.tests
		.filter((test) => !test.archived)
		.map((test) => {
			const scores = state.results.filter(
				(result) => result.testId === test._id && result.seasonId === seasonId,
			);
			const personal = scores.filter((result) => result.personId === personId);
			const best = scores
				.slice()
				.sort((left, right) =>
					fitnessLowerIsBetter(test)
						? left.value - right.value
						: right.value - left.value,
				)
				.at(0);
			const latest = personal
				.slice()
				.sort((left, right) => right.date.localeCompare(left.date))
				.at(0);
			return {
				test,
				personal: fitnessSummary(
					test.unit,
					personal,
					fitnessLowerIsBetter(test),
				),
				latest: latest ? { date: latest.date, value: latest.value } : undefined,
				teamBest: best
					? {
							name:
								members.find((member) => member.id === best.personId)?.name ??
								"Former member",
							value: best.value,
						}
					: undefined,
			};
		});
