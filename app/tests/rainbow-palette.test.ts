import { expect, test } from "bun:test";
import { avatarColors } from "../src/design-system/avatar-colors";
import { chartPalette } from "../src/design-system/chart-palette";
import {
	darkColorScales,
	lightColorScales,
} from "../src/design-system/color-scales";
import { rainbowPalette } from "../src/design-system/rainbow-palette";
import {
	darkTheme,
	featureColors,
	lightTheme,
} from "../src/design-system/tokens";

const paletteColors = new Set<string>(
	Object.values(rainbowPalette).flatMap(Object.values),
);
const colorsIn = (value: object | string): string[] =>
	typeof value === "string"
		? value.startsWith("#")
			? [value]
			: []
		: Object.values(value).flatMap(colorsIn);
const isNeutral = (color: string): boolean => {
	const channels = [1, 3, 5].map((offset) =>
		Number.parseInt(color.slice(offset, offset + 2), 16),
	);
	return Math.max(...channels) - Math.min(...channels) <= 8;
};

test("the rainbow has exactly seven hues and three approved shades per hue", (): void => {
	expect(Object.keys(rainbowPalette)).toEqual([
		"red",
		"orange",
		"yellow",
		"green",
		"blue",
		"indigo",
		"violet",
	]);
	expect(paletteColors.size).toBe(21);
	for (const hue of Object.values(rainbowPalette))
		expect(Object.keys(hue)).toEqual(["accent", "light", "dark"]);
});

test("feature colors reuse the rainbow rather than parallel ramps", (): void => {
	for (const color of colorsIn({
		featureColors,
	}))
		expect(paletteColors.has(color) || isNeutral(color)).toBe(true);
});

test("charts reuse all seven accents without a separate pink or amber shade", (): void => {
	expect(new Set(chartPalette.series)).toEqual(
		new Set(Object.values(rainbowPalette).map((color) => color.accent)),
	);
	expect(chartPalette.amber).toBe(rainbowPalette.yellow.accent);
});

test("avatar hues are deterministic and their contrast pair follows appearance", (): void => {
	for (const name of [
		"Alex",
		"Taylor",
		"Jamie",
		"River",
		"Morgan",
		"Sam",
		"Robin",
	])
		for (const mode of ["light", "dark"] as const) {
			const colors = avatarColors(name, mode);
			expect(avatarColors(`  ${name.toUpperCase()}  `, mode)).toEqual(colors);
			expect(
				Object.values(rainbowPalette).some(
					(hue) =>
						hue[mode] === colors.background &&
						hue[mode === "light" ? "dark" : "light"] === colors.foreground,
				),
			).toBe(true);
		}
});

test("performance actions and focus use the shared forest and lime accents", (): void => {
	expect(lightColorScales.accent.solid).toBe(lightTheme.accent.background);
	expect(darkColorScales.accent.solid).toBe(darkTheme.accent.background);
	expect(lightTheme.focus).toBe(lightTheme.accent.background);
	expect(darkTheme.focus).toBe(darkTheme.accent.background);
});
