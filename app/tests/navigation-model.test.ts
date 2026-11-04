import { expect, test } from "bun:test";
import { buttonColors } from "../src/design-system/button-colors";
import {
	hasUnread,
	navigationGeometry,
	navigationGradient,
	navigationLabel,
	navigationSelection,
	phoneNavigationItems,
} from "../src/design-system/navigation-model";
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

test("phone navigation keeps four destinations while Account remains available for desktop", (): void => {
	const destinations = [
		{ label: "Home", selected: false },
		{ label: "Schedule", selected: false },
		{ label: "Messages", selected: false },
		{ label: "Account", selected: true, showOnPhone: false },
		{ label: "Club", selected: false },
	];
	const phone = phoneNavigationItems(destinations);
	expect(phone.map((item) => item.label)).toEqual([
		"Home",
		"Schedule",
		"Messages",
		"Club",
	]);
	expect(destinations).toHaveLength(5);
	expect(navigationSelection(phone, "/account")).toBe(-1);
	expect(navigationGeometry(288, phone.length, 3)).toEqual({
		left: 216,
		width: 72,
	});
});

test("tab selection and underline geometry move immediately before the route update", (): void => {
	const items = [
		{ label: "Home", selected: true },
		{ label: "Schedule", selected: false },
		{ label: "Messages", selected: false },
		{ label: "Account", selected: false },
		{ label: "Club", selected: false },
	];
	expect(navigationSelection(items, "/")).toBe(0);
	const pending = { routeKey: "/", label: "Messages" };
	const immediate = navigationSelection(items, "/", pending);
	expect(immediate).toBe(2);
	expect(navigationGeometry(390, items.length, immediate)).toEqual({
		left: 156,
		width: 78,
	});
	const routed = items.map((item) => ({
		...item,
		selected: item.label === "Messages",
	}));
	expect(navigationSelection(routed, "/messages", pending)).toBe(2);
	expect(navigationSelection(items, "/schedule", pending)).toBe(0);
	expect(navigationGeometry(320, items.length, 4)).toEqual({
		left: 256,
		width: 64,
	});
});

test("layout changes derive exact tab bounds without an animation or division by zero", (): void => {
	for (const [width, count, index] of [
		[0, 5, 0],
		[390, 0, 0],
		[390, 5, -1],
		[390, 5, 5],
		[390, 1.5, 0],
		[Number.NaN, 5, 0],
		[390, 5, Number.POSITIVE_INFINITY],
	] as const)
		expect(navigationGeometry(width, count, index)).toBeUndefined();
	expect(navigationGeometry(844, 5, 3)).toEqual({
		left: 506.40000000000003,
		width: 168.8,
	});
});

test("unread dots retain the exact accessible count without adding visible counter text", (): void => {
	for (const count of [
		undefined,
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	]) {
		expect(hasUnread(count)).toBe(false);
		expect(navigationLabel("Messages", count)).toBe("Messages");
	}
	expect(hasUnread(1)).toBe(true);
	expect(navigationLabel("Messages", 1)).toBe(
		"Messages, 1 unread conversation",
	);
	expect(navigationLabel("Messages", 128)).toBe(
		"Messages, 128 unread conversations",
	);
});

test("selected and hover tab fills fade from theme green to the same fully transparent color", (): void => {
	for (const theme of [lightTheme, darkTheme]) {
		expect(navigationGradient(theme, false, false)).toBeUndefined();
		expect(navigationGradient(theme, true, false)).toEqual([
			theme.navigation.selected,
			`${theme.navigation.selected}00`,
		]);
		expect(navigationGradient(theme, false, true)).toEqual([
			theme.navigation.hover,
			`${theme.navigation.hover}00`,
		]);
		expect(navigationGradient(theme, true, true)).toEqual(
			navigationGradient(theme, true, false),
		);
		expect(
			contrast(theme.text.primary, theme.navigation.selected),
		).toBeGreaterThanOrEqual(4.5);
		expect(
			contrast(theme.text.secondary, theme.navigation.hover),
		).toBeGreaterThanOrEqual(4.5);
		for (const indicator of [
			theme.navigation.indicator,
			theme.navigation.unread,
		])
			expect(
				contrast(indicator, theme.background.secondary),
			).toBeGreaterThanOrEqual(3);
	}
});

test("monochrome primary actions retain contrast while outlined secondary buttons stay neutral", (): void => {
	for (const theme of [lightTheme, darkTheme]) {
		const primary = buttonColors(theme, "solid", "rest");
		const secondary = buttonColors(theme, "secondary", "rest");
		expect(primary.foreground).toBe(theme.accent.foreground);
		expect(primary.background).toBe(theme.accent.background);
		expect(secondary.background).toBe("transparent");
		expect(secondary.background).not.toBe(primary.background);
		expect(secondary.border).toBe(theme.controlBorder);
		expect(
			contrast(secondary.border, theme.background.primary),
		).toBeGreaterThanOrEqual(3);
		for (const interaction of ["rest", "hover", "pressed"] as const) {
			const colors = buttonColors(theme, "solid", interaction);
			expect(
				contrast(colors.foreground, colors.background),
			).toBeGreaterThanOrEqual(4.5);
		}
	}
});
