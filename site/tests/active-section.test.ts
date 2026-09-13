import { expect, test } from "bun:test";
import { activeSectionForScroll } from "../lib/active-section";

test("section selection tolerates boundary bounce after navigation", (): void => {
	expect(activeSectionForScroll([-500, 90, 900], 82, 1)).toBe(1);
	expect(activeSectionForScroll([-500, 125, 900], 82, 1)).toBe(1);
	expect(activeSectionForScroll([-500, 131, 900], 82, 1)).toBe(0);
});

test("selection still advances and handles large scroll jumps", (): void => {
	expect(activeSectionForScroll([-500, 80, 900], 82, 0)).toBe(1);
	expect(activeSectionForScroll([-1500, -500, 72], 82, 0)).toBe(2);
	expect(activeSectionForScroll([100, 700, 1400], 82, 2)).toBeUndefined();
	expect(
		activeSectionForScroll([undefined, 700], 82, undefined),
	).toBeUndefined();
});

test("returning to the hero clears selection beyond the boundary grace area", (): void => {
	expect(activeSectionForScroll([125, 700, 1400], 82, 0)).toBe(0);
	expect(activeSectionForScroll([131, 700, 1400], 82, 0)).toBeUndefined();
	expect(
		activeSectionForScroll([800, 1500, 2200], 82, undefined),
	).toBeUndefined();
});
