import { atom } from "jotai";
import {
	type FitnessAction,
	type FitnessState,
	reduceFitness,
} from "../domain/fitness-model";
import { defaultSeasonId } from "../domain/seasons";
import { previewAccountAtom, previewDataAtom } from "./app-state";

const dates = ["2026-09-15", "2026-10-01", "2026-10-25"];
export const previewFitnessAtom = atom<FitnessState>({
	tests: [
		{
			_id: "swim",
			name: "50 m swim",
			unit: "time",
			archived: false,
			revision: 1,
		},
		{
			_id: "lengths",
			name: "Pool lengths",
			unit: "count",
			archived: false,
			revision: 1,
		},
		{
			_id: "equalization",
			name: "Equalization drill",
			unit: "pass_fail",
			archived: false,
			revision: 1,
		},
	],
	sessions: ["swim", "lengths", "equalization"].flatMap((testId) =>
		dates.map((date, index) => ({
			_id: `${testId}-${index}`,
			testId,
			seasonId: defaultSeasonId,
			date,
			notes: "Club fitness session",
			revision: 1,
			resultCount: 3,
		})),
	),
	results: ["swim", "lengths", "equalization"].flatMap((testId) =>
		dates.flatMap((date, index) =>
			["sam", "mila", "alex"].map((personId, personIndex) => ({
				testId,
				sessionId: `${testId}-${index}`,
				seasonId: defaultSeasonId,
				personId,
				date,
				value:
					testId === "swim"
						? 88 + personIndex * 4 - index * 3
						: testId === "lengths"
							? 12 + personIndex + index * 2
							: index > 0 || personIndex === 2
								? 1
								: 0,
				notes: "",
			})),
		),
	),
});
export const previewFitnessActionAtom = atom(
	undefined,
	(get, set, action: FitnessAction): void => {
		set(
			previewFitnessAtom,
			reduceFitness(
				get(previewFitnessAtom),
				get(previewAccountAtom),
				get(previewDataAtom),
				action,
			),
		);
	},
);
