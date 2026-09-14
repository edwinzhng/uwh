import { expect, test } from "bun:test";
import { buttonColors } from "../src/design-system/button-colors";
import { darkTheme, lightTheme } from "../src/design-system/tokens";

const luminance = (hex: string): number => {
	const channels = [1, 3, 5]
		.map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
		.map((channel) =>
			channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
		);
	return (
		(channels.at(0) ?? 0) * 0.2126 +
		(channels.at(1) ?? 0) * 0.7152 +
		(channels.at(2) ?? 0) * 0.0722
	);
};
const contrast = (first: string, second: string): number =>
	(Math.max(luminance(first), luminance(second)) + 0.05) /
	(Math.min(luminance(first), luminance(second)) + 0.05);

for (const [name, theme] of Object.entries({
	light: lightTheme,
	dark: darkTheme,
})) {
	test(`${name} theme text, actions, status labels, and controls retain contrast`, () => {
		for (const surface of [
			theme.background.primary,
			theme.background.secondary,
			theme.background.selected,
			theme.background.tertiary,
			theme.background.hover,
			theme.background.pressed,
		]) {
			expect(contrast(theme.text.primary, surface)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(theme.text.secondary, surface)).toBeGreaterThanOrEqual(
				4.5,
			);
		}
		expect(
			contrast(theme.accent.background, theme.accent.foreground),
		).toBeGreaterThanOrEqual(4.5);
		for (const scale of Object.values(theme.colorScales)) {
			expect(contrast(scale.text, scale.subtle)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(scale.text, scale.muted)).toBeGreaterThanOrEqual(4.5);
		}
		expect(
			contrast(theme.text.contrast, theme.background.contrast),
		).toBeGreaterThanOrEqual(4.5);
		for (const variant of [
			"solid",
			"danger",
			"secondary",
			"ghost",
			"selection",
		] as const) {
			for (const interaction of [
				"rest",
				"hover",
				"pressed",
				"disabled",
			] as const) {
				const colors = buttonColors(theme, variant, interaction);
				const background =
					colors.background === "transparent"
						? theme.background.primary
						: colors.background;
				expect(contrast(colors.foreground, background)).toBeGreaterThanOrEqual(
					4.5,
				);
			}
		}
		for (const status of [
			theme.success,
			theme.warning,
			theme.danger,
			theme.pending,
		])
			expect(
				contrast(status.foreground, theme.background.primary),
			).toBeGreaterThanOrEqual(4.5);
		expect(
			contrast(theme.switchThumbOn, theme.switchOn),
		).toBeGreaterThanOrEqual(3);
		expect(
			contrast(theme.switchThumbOff, theme.switchOff),
		).toBeGreaterThanOrEqual(3);
		expect(
			contrast(theme.controlBorder, theme.background.primary),
		).toBeGreaterThanOrEqual(3);
		expect(
			contrast(theme.focus, theme.background.primary),
		).toBeGreaterThanOrEqual(3);
		for (const kind of [
			theme.neutral,
			theme.brand,
			theme.success,
			theme.info,
			theme.warning,
			theme.danger,
			theme.coach,
			theme.admin,
		])
			expect(contrast(kind.foreground, kind.background)).toBeGreaterThanOrEqual(
				4.5,
			);
	});
}
