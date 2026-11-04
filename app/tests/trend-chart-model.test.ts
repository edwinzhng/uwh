import { expect, test } from "bun:test";
import {
	trendDomain,
	trendPosition,
} from "../src/design-system/trend-chart-model";

test("sparse chart points stay centered with symmetric breathing room", () => {
	expect(trendPosition(0, 1)).toBe(0.5);
	expect(trendPosition(0, 2)).toBeCloseTo(1 / 3);
	expect(trendPosition(1, 2)).toBeCloseTo(2 / 3);
	expect(trendPosition(0, 3)).toBe(0.25);
	expect(trendPosition(2, 3)).toBe(0.75);
	expect(trendPosition(0, 100)).toBeGreaterThan(0);
	expect(trendPosition(99, 100)).toBeLessThan(1);
});

test("constant and empty chart series retain a finite visible domain", () => {
	expect(trendDomain([])).toEqual([0, 1]);
	const [min, max] = trendDomain([
		{ id: "time", label: "Time", points: [{ date: "2026-11-04", value: 90 }] },
	]);
	expect(min).toBeLessThan(90);
	expect(max).toBeGreaterThan(90);
});
