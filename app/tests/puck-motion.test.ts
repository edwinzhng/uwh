import { expect, test } from "bun:test";
import { advancePuckPhase } from "../src/design-system/puck-motion";

test("normal frames preserve the rotation period", (): void => {
	const phase = Array.from({ length: 480 }).reduce<number>(
		(current) => advancePuckPhase(current, 1000 / 60, 8000),
		0,
	);
	expect(Math.min(phase, Math.PI * 2 - phase)).toBeLessThan(0.00001);
});

test("a delayed startup frame cannot teleport the puck forward", (): void => {
	const start = 0.5;
	const next = advancePuckPhase(start, 2000, 8000);
	expect(next).toBeGreaterThan(start);
	expect(next - start).toBeLessThan(0.04);
	expect(advancePuckPhase(start, 0, 8000)).toBe(start);
	expect(advancePuckPhase(start, -10, 8000)).toBe(start);
});

test("rotation wraps in the same direction without discontinuity", (): void => {
	const start = Math.PI * 2 - 0.001;
	const next = advancePuckPhase(start, 16, 8000);
	expect(next).toBeGreaterThan(0);
	expect(next).toBeLessThan(0.02);
});
