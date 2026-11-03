import { describe, expect, test } from "bun:test";
import {
	coalesceScrollReveal,
	type ScrollRevealRequest,
	scrollRevealDestination,
} from "../src/design-system/scroll-reveal";

const activation: ScrollRevealRequest = {
	range: { start: 400, end: 510, inset: 16 },
	intent: "activation",
};
const layout: ScrollRevealRequest = { ...activation, intent: "layout" };
const geometry = {
	offset: 0,
	viewportSize: 390,
	contentSize: 600,
	interrupted: false,
};

describe("coalesced scroll reveal", () => {
	test("focus and selection requests resolve to one latest activation per frame", (): void => {
		const next: ScrollRevealRequest = {
			intent: "activation",
			range: { start: 480, end: 580, inset: 16 },
		};
		expect(coalesceScrollReveal(undefined, activation)).toBe(activation);
		expect(coalesceScrollReveal(activation, activation)).toBe(activation);
		expect(coalesceScrollReveal(activation, next)).toBe(next);
	});

	test("a layout update cannot replace a pending user activation", (): void => {
		expect(coalesceScrollReveal(activation, layout)).toBe(activation);
		expect(coalesceScrollReveal(layout, activation)).toBe(activation);
		const changed = { ...layout, range: { start: 410, end: 520, inset: 16 } };
		expect(coalesceScrollReveal(layout, changed)).toBe(changed);
	});

	test("a partly scrolled duplicate keeps its existing destination without restarting", (): void => {
		expect(scrollRevealDestination({ ...geometry, request: activation })).toBe(
			136,
		);
		for (const offset of [0, 20, 80, 120, 135])
			expect(
				scrollRevealDestination({
					...geometry,
					offset,
					target: 136,
					request: activation,
				}),
			).toBeUndefined();
	});

	test("subpixel layout noise cannot repeatedly restart reveal", (): void => {
		expect(
			scrollRevealDestination({
				...geometry,
				offset: 40,
				target: 136,
				request: { ...layout, range: { start: 400, end: 510.5, inset: 16 } },
			}),
		).toBeUndefined();
	});

	test("a different activated tab can retarget an in-flight reveal", (): void => {
		expect(
			scrollRevealDestination({
				...geometry,
				offset: 80,
				target: 136,
				request: {
					intent: "activation",
					range: { start: 16, end: 110, inset: 16 },
				},
			}),
		).toBe(0);
	});

	test("user scrolling suppresses layout reveals until another explicit activation", (): void => {
		expect(
			scrollRevealDestination({
				...geometry,
				interrupted: true,
				request: layout,
			}),
		).toBeUndefined();
		expect(
			scrollRevealDestination({
				...geometry,
				interrupted: true,
				request: activation,
			}),
		).toBe(136);
	});

	test("resize clamps an existing destination to the new scroll bounds", (): void => {
		expect(
			scrollRevealDestination({
				...geometry,
				offset: 100,
				target: 136,
				viewportSize: 600,
				request: layout,
			}),
		).toBe(0);
	});

	test("fully visible and unmeasured content does not start an animation", (): void => {
		expect(
			scrollRevealDestination({ ...geometry, offset: 136, request: layout }),
		).toBeUndefined();
		expect(
			scrollRevealDestination({
				...geometry,
				viewportSize: 0,
				request: layout,
			}),
		).toBeUndefined();
		expect(
			scrollRevealDestination({
				...geometry,
				contentSize: Number.NaN,
				request: layout,
			}),
		).toBeUndefined();
	});
});
