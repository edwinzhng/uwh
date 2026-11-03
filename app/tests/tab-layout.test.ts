import { describe, expect, test } from "bun:test";
import {
	pageTabInset,
	scrollOffsetToReveal,
} from "../src/design-system/scroll-visibility";
import {
	type TabSize,
	tabFrame,
	tabScrollRange,
} from "../src/design-system/tab-layout";

const size = (width: number, height = 44): TabSize => ({ width, height });
const shortTabs = [
	{ value: "announcements", size: size(270) },
	{ value: "manage", size: size(132) },
] as const;

describe("tab indicator content coordinates", () => {
	test("keeps the first underline with its label after the page inset measures", (): void => {
		const frame = tabFrame(shortTabs, "announcements", 16);
		expect(frame).toEqual({ x: 0, y: 0, width: 270, height: 44 });
		if (!frame) throw new Error("Missing tab measurement");
		const inset = pageTabInset(1056, 960, true);
		expect(tabScrollRange(frame, 0, 16)).toEqual({
			start: 0,
			end: 270,
			inset: 16,
		});
		expect(tabScrollRange(frame, inset, 16)).toEqual({
			start: 48,
			end: 318,
			inset: 16,
		});
		expect(tabFrame(shortTabs, "announcements", 16)).toEqual(frame);
	});

	test("derives gap changes without waiting for a position-only layout event", (): void => {
		expect(tabFrame(shortTabs, "manage", 16)).toEqual({
			x: 286,
			y: 0,
			width: 132,
			height: 44,
		});
		expect(tabFrame(shortTabs, "manage", 4)?.x).toBe(274);
		expect(tabFrame(shortTabs.toReversed(), "manage", 16)?.x).toBe(0);
		expect(tabFrame(shortTabs.toReversed(), "announcements", 16)?.x).toBe(148);
	});

	test("updates following tabs when an earlier label resizes", (): void => {
		const changed = shortTabs.map((option) =>
			option.value === "announcements"
				? { ...option, size: size(310, 52) }
				: option,
		);
		expect(tabFrame(changed, "manage", 16)?.x).toBe(326);
		expect(tabFrame(changed, "announcements", 16)?.height).toBe(52);
	});

	test("does not scroll a few fully visible tabs on a wide page", (): void => {
		const frame = tabFrame(shortTabs, "manage", 16);
		if (!frame) throw new Error("Missing tab measurement");
		expect(
			scrollOffsetToReveal({
				...tabScrollRange(frame, 48, 16),
				offset: 0,
				viewportSize: 1056,
				contentSize: 1056,
			}),
		).toBe(0);
	});

	test("reveals overflowing tabs using content inset exactly once", (): void => {
		const options = [
			{ value: "first", size: size(120) },
			{ value: "second", size: size(180) },
			{ value: "third", size: size(150) },
			{ value: "last", size: size(160) },
		];
		const frame = tabFrame(options, "last", 4);
		if (!frame) throw new Error("Missing tab measurement");
		const range = tabScrollRange(frame, 16, 16);
		expect(frame.x).toBe(462);
		expect(range).toEqual({ start: 478, end: 638, inset: 16 });
		const offset = scrollOffsetToReveal({
			...range,
			offset: 80,
			viewportSize: 390,
			contentSize: 654,
		});
		expect(offset).toBe(264);
		expect(range.start - offset).toBe(214);
		expect(range.end - offset).toBe(374);
		expect(tabFrame(options, "last", 4)).toEqual(frame);
	});

	test("re-reveals selected content when resizing after a manual scroll", (): void => {
		const frame = tabFrame(shortTabs, "manage", 4);
		if (!frame) throw new Error("Missing tab measurement");
		expect(
			scrollOffsetToReveal({
				...tabScrollRange(frame, 16, 16),
				offset: 120,
				viewportSize: 320,
				contentSize: 438,
			}),
		).toBe(118);
		expect(
			scrollOffsetToReveal({
				...tabScrollRange(frame, 48, 16),
				offset: 118,
				viewportSize: 1056,
				contentSize: 1056,
			}),
		).toBe(0);
	});

	test("waits for preceding widths instead of drawing an incorrectly positioned underline", (): void => {
		expect(
			tabFrame(
				[{ value: "first" }, { value: "last", size: size(90) }],
				"last",
				16,
			),
		).toBeUndefined();
		expect(tabFrame(shortTabs, "missing", 16)).toBeUndefined();
		expect(
			tabFrame([{ value: "first", size: size(Number.NaN) }], "first", 16),
		).toBeUndefined();
		expect(
			tabFrame([{ value: "first", size: size(0) }], "first", 16),
		).toBeUndefined();
	});
});
