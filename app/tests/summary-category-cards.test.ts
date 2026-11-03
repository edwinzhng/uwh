import { expect, test } from "bun:test";
import { categoryGridColumns } from "../src/design-system/category-grid-model";
import {
	categoryPalette,
	darkTheme,
	featureColors,
	lightTheme,
	palette,
	progressColors,
} from "../src/design-system/tokens";

const luminance = (hex: string): number => {
	const channels = [1, 3, 5].map((start) => {
		const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return (
		(channels.at(0) ?? 0) * 0.2126 +
		(channels.at(1) ?? 0) * 0.7152 +
		(channels.at(2) ?? 0) * 0.0722
	);
};

const contrast = (first: string, second: string): number => {
	const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return ((values.at(0) ?? 0) + 0.05) / ((values.at(1) ?? 0) + 0.05);
};

test("the performance palette has one green-to-lime progress gradient", (): void => {
	expect(Object.keys(palette)).not.toContain("moss");
	expect(Object.keys(palette)).not.toContain("pine");
	expect(progressColors).toEqual(["#173E2B", "#638E41", "#D8FF63"]);
});

test("browse cards use one phone column, two desktop columns and a readable large-text fallback", (): void => {
	for (const width of [288, 320, 358, 390, 600, 799])
		expect(categoryGridColumns(width, 1)).toBe(1);
	expect(categoryGridColumns(800, 1)).toBe(2);
	expect(categoryGridColumns(1080, 1)).toBe(2);
	expect(categoryGridColumns(240, 1)).toBe(1);
	expect(categoryGridColumns(358, 1, 148)).toBe(2);
	expect(categoryGridColumns(288, 1, 148)).toBe(1);
	expect(categoryGridColumns(358, 1.4, 148)).toBe(1);
	expect(categoryGridColumns(390, 1.4)).toBe(1);
	expect(categoryGridColumns(1080, 2)).toBe(1);
});

test("categories reuse the actual palette and maintain readable paired and neutral-card labels", (): void => {
	expect(categoryPalette).toBe(featureColors);
	for (const theme of [lightTheme, darkTheme])
		for (const colors of Object.values(categoryPalette[theme.mode])) {
			expect(
				contrast(colors.foreground, colors.background),
			).toBeGreaterThanOrEqual(4.5);
			expect(
				contrast(colors.foreground, theme.background.primary),
			).toBeGreaterThanOrEqual(4.5);
		}
});

test("summary actions are siblings and cards retain touch targets and optional haptics", async (): Promise<void> => {
	const summary = await Bun.file(
		new URL("../src/design-system/summary-card.tsx", import.meta.url),
	).text();
	const category = await Bun.file(
		new URL("../src/design-system/category-card.tsx", import.meta.url),
	).text();
	for (const source of [summary, category]) {
		expect(source).toContain("useButtonHaptics()");
		expect(source).toContain('accessibilityRole="button"');
		expect(source).toMatch(/minHeight:\s*geometry.touch/);
		expect(source).not.toContain("motion.duration");
	}
	expect(summary.lastIndexOf("{action ?")).toBeGreaterThan(
		summary.indexOf("</Pressable>"),
	);
});
