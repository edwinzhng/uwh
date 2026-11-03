import { expect, test } from "bun:test";
import {
	fitnessChange,
	type PersonalFitnessRow,
} from "../src/domain/personal-fitness";

const row = (
	latest: number,
	previous: number,
	unit: PersonalFitnessRow["test"]["unit"] = "time",
	lowerIsBetter?: boolean,
): PersonalFitnessRow => ({
	test: {
		_id: "swim",
		name: "Swim",
		unit,
		lowerIsBetter,
		archived: false,
		revision: 0,
	},
	history: [
		{ sessionId: "latest", date: "2026-10-25", value: latest, notes: "" },
		{ sessionId: "previous", date: "2026-10-18", value: previous, notes: "" },
	],
	limited: false,
});

test("fitness arrows show numeric direction while color follows test scoring", (): void => {
	expect(fitnessChange(row(90, 93))).toEqual({
		value: "0:03",
		direction: "down",
		improved: true,
	});
	expect(fitnessChange(row(93, 90))).toEqual({
		value: "0:03",
		direction: "up",
		improved: false,
	});
	expect(fitnessChange(row(18, 16, "count"))).toEqual({
		value: "2",
		direction: "up",
		improved: true,
	});
	expect(fitnessChange(row(16, 18, "count"))?.improved).toBe(false);
	expect(fitnessChange(row(30, 25, "distance", true))).toEqual({
		value: "5 m",
		direction: "up",
		improved: false,
	});
});

test("unchanged, pass/fail and first results do not imply an improvement", (): void => {
	expect(fitnessChange(row(90, 90))?.direction).toBe("equal");
	expect(fitnessChange(row(1, 0, "pass_fail"))).toBeUndefined();
	const first = row(90, 93);
	expect(
		fitnessChange({ ...first, history: first.history.slice(0, 1) }),
	).toBeUndefined();
});
