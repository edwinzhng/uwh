import { expect, test } from "bun:test";
import {
	latestIsPersonalBest,
	type PersonalFitnessRow,
} from "../src/domain/personal-fitness";

const row = (
	values: number[],
	best?: number,
	unit: PersonalFitnessRow["test"]["unit"] = "time",
): PersonalFitnessRow => ({
	test: { _id: "test", name: "Swim", unit, archived: false, revision: 0 },
	history: values.map((value, index) => ({
		value,
		sessionId: `${index}`,
		date: "2026-11-04",
		notes: "",
	})),
	stats: {
		count: values.length,
		total: values.reduce((sum, value) => sum + value, 0),
		best,
	},
	limited: false,
});

test("the latest personal best includes a tied best instead of reporting no change", (): void => {
	expect(latestIsPersonalBest(row([90, 90], 90))).toBe(true);
	expect(latestIsPersonalBest(row([85, 90], 85))).toBe(true);
	expect(latestIsPersonalBest(row([95, 95, 90], 90))).toBe(false);
	expect(latestIsPersonalBest(row([100, 90], 90))).toBe(false);
});

test("first results, higher-is-better tests and zero retain their real meaning", (): void => {
	expect(latestIsPersonalBest(row([90], 90))).toBe(true);
	expect(latestIsPersonalBest(row([12, 10], 12, "count"))).toBe(true);
	expect(latestIsPersonalBest(row([0], 0, "count"))).toBe(true);
	expect(latestIsPersonalBest(row([], undefined))).toBe(false);
	expect(latestIsPersonalBest(row([1], 1, "pass_fail"))).toBe(false);
});
