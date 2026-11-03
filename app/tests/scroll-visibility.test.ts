import { describe, expect, test } from "bun:test";
import {
	pageTabInset,
	scrollOffsetToReveal,
} from "../src/design-system/scroll-visibility";

describe("full-bleed page tabs", () => {
	test("measures the bounded wrapper without feeding the bleed back into its width", (): void => {
		expect(pageTabInset(390, 358, true)).toBe(16);
		expect(pageTabInset(1056, 960, true)).toBe(48);
		expect(pageTabInset(390, 358, false)).toBe(0);
		expect(pageTabInset(390, 0, true)).toBe(0);
		expect(pageTabInset(390, 420, true)).toBe(0);
		expect(pageTabInset(Number.NaN, 358, true)).toBe(0);
	});

	test("reveals a clipped end tab including its edge-fade clearance", (): void => {
		expect(
			scrollOffsetToReveal({
				offset: 0,
				viewportSize: 390,
				contentSize: 540,
				start: 400,
				end: 510,
				inset: 16,
			}),
		).toBe(136);
	});

	test("reveals Home after End and leaves fully visible ranges untouched", (): void => {
		const common = { viewportSize: 320, contentSize: 600, inset: 16 };
		expect(
			scrollOffsetToReveal({ ...common, offset: 280, start: 16, end: 100 }),
		).toBe(0);
		expect(
			scrollOffsetToReveal({ ...common, offset: 100, start: 140, end: 250 }),
		).toBe(100);
	});

	test("clamps requests to physical scroll bounds and prioritizes oversized labels' start", (): void => {
		expect(
			scrollOffsetToReveal({
				offset: 0,
				viewportSize: 320,
				contentSize: 500,
				start: 430,
				end: 500,
				inset: 16,
			}),
		).toBe(180);
		expect(
			scrollOffsetToReveal({
				offset: 0,
				viewportSize: 320,
				contentSize: 900,
				start: 100,
				end: 600,
				inset: 16,
			}),
		).toBe(84);
	});

	test("handles unmeasured, invalid and non-overflowing layouts without invalid offsets", (): void => {
		const common = { offset: 50, start: 10, end: 90 };
		expect(
			scrollOffsetToReveal({ ...common, viewportSize: 0, contentSize: 500 }),
		).toBe(0);
		expect(
			scrollOffsetToReveal({ ...common, viewportSize: 320, contentSize: 100 }),
		).toBe(0);
		expect(
			scrollOffsetToReveal({
				...common,
				viewportSize: 320,
				contentSize: 500,
				start: Number.NaN,
			}),
		).toBe(50);
	});
});
