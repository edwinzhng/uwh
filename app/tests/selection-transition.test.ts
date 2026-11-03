import { expect, test } from "bun:test";
import { selectionTransition } from "../src/design-system/selection-transition";

test("unequal segments start from the previous visible bounds after the target layout commits", (): void => {
	expect(
		selectionTransition(
			{ x: 0, width: 80 },
			{ x: 84, width: 120 },
			{ x: 84, width: 120 },
		),
	).toEqual({ x: -84, scale: 80 / 120 });
});

test("rapid forward retaps continue from the interrupted position and width", (): void => {
	expect(
		selectionTransition(
			{ x: 84, width: 120 },
			{ x: 208, width: 60 },
			{ x: 166, width: 54 },
		),
	).toEqual({ x: -166, scale: 1.8 });
});

test("rapid reversals preserve the in-flight bounds instead of restarting at the last target", (): void => {
	expect(
		selectionTransition(
			{ x: 208, width: 60 },
			{ x: 0, width: 80 },
			{ x: -83, width: 96 },
		),
	).toEqual({ x: 125, scale: 0.9 });
});

test("unchanged bounds do not introduce movement", (): void => {
	expect(
		selectionTransition(
			{ x: 84, width: 120 },
			{ x: 84, width: 120 },
			{ x: 84, width: 120 },
		),
	).toEqual({ x: 0, scale: 1 });
});
