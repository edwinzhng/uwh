import { expect, test } from "bun:test";
import { staggerDelay } from "../src/design-system/stagger-policy";

test("content groups share a short capped stagger", (): void => {
	expect([0, 1, 2, 3].map(staggerDelay)).toEqual([0, 70, 140, 210]);
});

test("long lists and invalid positions do not schedule animations", (): void => {
	for (const index of [4, 20, 1000, -1, 0.5, Number.NaN])
		expect(staggerDelay(index)).toBeUndefined();
});
