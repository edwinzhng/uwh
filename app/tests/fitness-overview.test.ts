import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { FitnessState } from "../src/domain/fitness-model";
import { previewFitnessOverview } from "../src/domain/fitness-overview";

test("all-test overview separates personal best, latest, team best and seasons", () => {
	const state: FitnessState = {
		tests: [
			{
				_id: "time",
				name: "Sprint",
				unit: "time",
				archived: false,
				revision: 0,
			},
			{
				_id: "count",
				name: "Lengths",
				unit: "count",
				archived: false,
				revision: 0,
			},
			{
				_id: "pass",
				name: "Safety",
				unit: "pass_fail",
				archived: false,
				revision: 0,
			},
			{
				_id: "old",
				name: "Archived",
				unit: "count",
				archived: true,
				revision: 0,
			},
		],
		sessions: [],
		results: [
			{
				testId: "time",
				sessionId: "one",
				seasonId: "current",
				personId: "sam",
				date: "2026-09-01",
				value: 40,
				notes: "",
			},
			{
				testId: "time",
				sessionId: "two",
				seasonId: "current",
				personId: "sam",
				date: "2026-10-01",
				value: 42,
				notes: "",
			},
			{
				testId: "time",
				sessionId: "two",
				seasonId: "current",
				personId: "taylor",
				date: "2026-10-01",
				value: 39,
				notes: "",
			},
			{
				testId: "time",
				sessionId: "old",
				seasonId: "past",
				personId: "sam",
				date: "2025-10-01",
				value: 20,
				notes: "",
			},
			{
				testId: "count",
				sessionId: "three",
				seasonId: "current",
				personId: "sam",
				date: "2026-10-02",
				value: 0,
				notes: "",
			},
			{
				testId: "pass",
				sessionId: "four",
				seasonId: "current",
				personId: "sam",
				date: "2026-10-03",
				value: 1,
				notes: "",
			},
		],
	};
	const rows = previewFitnessOverview(
		state,
		initialAppData.members,
		"current",
		"sam",
	);
	expect(rows).toHaveLength(3);
	expect(rows.at(0)?.personal).toEqual({ best: 40, count: 2, total: 82 });
	expect(rows.at(0)?.latest).toEqual({ value: 42, date: "2026-10-01" });
	expect(rows.at(0)?.teamBest).toEqual({ value: 39, name: "Brad Smith" });
	expect(rows.at(1)?.personal?.best).toBe(0);
	expect(rows.at(2)?.personal?.best).toBe(1);
	expect(
		previewFitnessOverview(state, initialAppData.members, "empty").every(
			(row) => !row.personal && !row.teamBest && !row.latest,
		),
	).toBe(true);
});
