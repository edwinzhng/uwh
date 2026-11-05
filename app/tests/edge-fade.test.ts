import { expect, test } from "bun:test";
import {
	edgeFadeLocations,
	messageFadeLocations,
} from "../src/design-system/edge-fade";

test("toolbar fading starts after the complete bar and safe area, and reaches transparent at its outer edge", (): void => {
	for (const bar of [44, 60, 88])
		for (const safe of [0, 20, 59]) {
			const tail = 16;
			const height = bar + safe + tail;
			const top = edgeFadeLocations(height, tail, "top");
			const bottom = edgeFadeLocations(height, tail, "bottom");
			expect((top.at(1) ?? 0) * height).toBeCloseTo(bar + safe);
			expect(top.at(-1)).toBe(1);
			expect((bottom.at(1) ?? 0) * height).toBeCloseTo(tail);
			expect(bottom.at(0)).toBe(0);
		}
});
test("message fades remain confined to their own viewport through keyboard resizing and short layouts", (): void => {
	for (const height of [0, 8, 24, 100, 500, 900]) {
		const stops = messageFadeLocations(height, 12);
		expect(stops.at(0)).toBe(0);
		expect(stops.at(-1)).toBe(1);
		expect(
			stops.every(
				(value, index) =>
					value >= 0 &&
					value <= 1 &&
					(index === 0 || value >= (stops.at(index - 1) ?? 0)),
			),
		).toBe(true);
		if (height >= 24) expect((stops.at(1) ?? 0) * height).toBeCloseTo(12);
	}
});
