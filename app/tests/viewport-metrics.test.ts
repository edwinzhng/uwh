import { describe, expect, test } from "bun:test";
import {
	trackViewport,
	viewportMetrics,
} from "../src/design-system/viewport-metrics";

const initial = {
	width: 390,
	height: 844,
	baselineHeight: 844,
	focused: false,
};

describe("visible web viewport", () => {
	test("preserves the layout viewport when the browser API is unavailable", (): void => {
		expect(viewportMetrics(initial)).toEqual({
			width: 390,
			height: 844,
			top: 0,
			keyboardVisible: false,
		});
	});

	test("uses Safari visible height and pan offset while editing", (): void => {
		expect(
			viewportMetrics({
				...initial,
				focused: true,
				visualHeight: 480,
				visualTop: 36,
			}),
		).toEqual({
			width: 390,
			height: 480,
			top: 36,
			keyboardVisible: true,
		});
	});

	test("detects Android layout resize against the pre-keyboard baseline", (): void => {
		expect(
			viewportMetrics({
				...initial,
				height: 470,
				visualHeight: 470,
				focused: true,
			}).keyboardVisible,
		).toBe(true);
	});

	test("does not interpret browser chrome, blur, or pinch zoom as a keyboard", (): void => {
		for (const input of [
			{ ...initial, focused: true, visualHeight: 780 },
			{ ...initial, visualHeight: 470 },
			{ ...initial, focused: true, visualHeight: 422, scale: 2 },
		])
			expect(viewportMetrics(input).keyboardVisible).toBe(false);
		expect(
			viewportMetrics({
				...initial,
				visualHeight: 422,
				visualTop: 120,
				scale: 2,
			}),
		).toEqual({
			width: 390,
			height: 844,
			top: 0,
			keyboardVisible: false,
		});
	});

	test("bounds visual height and offset without exceeding the layout viewport", (): void => {
		expect(
			viewportMetrics({ ...initial, visualHeight: 900, visualTop: -30 }),
		).toEqual({
			width: 390,
			height: 844,
			top: 0,
			keyboardVisible: false,
		});
		expect(
			viewportMetrics({ ...initial, visualHeight: Number.NaN }).height,
		).toBe(844);
	});
});

describe("keyboard baseline tracking", () => {
	const resting = trackViewport(undefined, {
		width: 390,
		height: 844,
		focused: false,
	});
	const editing = trackViewport(resting, {
		width: 390,
		height: 470,
		focused: true,
	});

	test("preserves keyboard visibility through phone landscape and portrait rotations", (): void => {
		expect(editing.metrics.keyboardVisible).toBe(true);
		const landscape = trackViewport(editing, {
			width: 844,
			height: 180,
			focused: true,
		});
		expect(landscape.metrics.keyboardVisible).toBe(true);
		expect(landscape.baselineHeight).toBe(390);
		const portrait = trackViewport(landscape, {
			width: 390,
			height: 470,
			focused: true,
		});
		expect(portrait.metrics.keyboardVisible).toBe(true);
		expect(portrait.baselineHeight).toBe(844);
	});

	test("recognizes keyboard dismissal after rotating without requiring blur", (): void => {
		const landscape = trackViewport(editing, {
			width: 844,
			height: 180,
			focused: true,
		});
		expect(
			trackViewport(landscape, {
				width: 844,
				height: 342,
				focused: true,
			}).metrics.keyboardVisible,
		).toBe(false);
	});

	test("minor width changes do not forget an open keyboard baseline", (): void => {
		const resized = trackViewport(editing, {
			width: 400,
			height: 470,
			focused: true,
		});
		expect(resized.baselineHeight).toBe(844);
		expect(resized.metrics.keyboardVisible).toBe(true);
	});

	test("ordinary viewport resize while not editing resets the baseline", (): void => {
		const resized = trackViewport(resting, {
			width: 390,
			height: 550,
			focused: false,
		});
		expect(resized.baselineHeight).toBe(550);
		expect(
			trackViewport(resized, {
				width: 390,
				height: 550,
				focused: true,
			}).metrics.keyboardVisible,
		).toBe(false);
	});

	test("unchanged observations reuse the previous state", (): void => {
		expect(
			trackViewport(resting, {
				width: 390,
				height: 844,
				focused: false,
			}),
		).toBe(resting);
	});
});
