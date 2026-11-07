import { expect, test } from "bun:test";
import { invokeMenuAction } from "../src/design-system/context-menu-policy";
import { interactiveRow } from "../src/design-system/interactive-row-layout";
import { materialColors } from "../src/design-system/materials";
import { nativeMenuActions } from "../src/design-system/native-menu-actions";
import {
	corners,
	darkTheme,
	elevation,
	font,
	lightTheme,
	typography,
} from "../src/design-system/tokens";

test("product typography uses five sizes and one section heading scale", (): void => {
	const sizes = [
		...new Set(Object.values(typography).map((value) => value.fontSize)),
	].sort((a, b) => a - b);
	expect(sizes).toEqual([12, 14, 16, 18, 32]);
	expect(typography.h2.fontSize).toBe(typography.h4.fontSize);
	expect(typography.h3.fontSize).toBe(typography.h4.fontSize);
	expect(typography.h2).toEqual(typography.h4);
	expect(typography.h3).toEqual(typography.h4);
	expect(typography.label.fontSize).toBe(typography.body.fontSize);
	expect(font.medium).not.toBe(font.semibold);
	expect(corners.control).toBe(8);
	expect(corners.button).toBe(corners.control);
});

test("interactive shapes share their corner owner and menus follow their row inset", (): void => {
	expect(corners.navigation).toBe(corners.control);
	expect(corners.menuRow).toBe(interactiveRow.borderRadius);
	expect(corners.menu).toBe(corners.menuRow + interactiveRow.gutter);
	expect(corners.panel).toBe(12);
	expect(corners.overlay).toBe(32);
});

test("neutral surfaces and overlays consume the app elevation foundation", (): void => {
	expect(lightTheme.background.canvas).toBe(lightTheme.background.primary);
	expect(lightTheme.background.secondary).not.toBe(
		lightTheme.background.canvas,
	);
	for (const theme of [lightTheme, darkTheme]) {
		expect(materialColors(theme).shadow).toBe(elevation.floating.boxShadow);
		expect(materialColors(theme).overlayShadow).toBe(
			elevation.overlay.boxShadow,
		);
	}
});

test("system menus retain selected, disabled, destructive, and action identity semantics", (): void => {
	const calls: string[] = [];
	const groups = [
		{
			id: "account",
			items: [
				{
					id: "selected",
					label: "Selected",
					checked: true,
					onSelect: (): void => {
						calls.push("selected");
					},
				},
				{
					id: "disabled",
					label: "Disabled",
					isDisabled: true,
					onSelect: (): void => {
						calls.push("disabled");
					},
				},
				{
					id: "remove",
					label: "Remove",
					tone: "danger" as const,
					onSelect: (): void => {
						calls.push("remove");
					},
				},
			],
		},
	];
	const actions = nativeMenuActions(groups).at(0)?.subactions;
	expect(actions?.at(0)?.state).toBe("on");
	expect(actions?.at(1)?.attributes?.disabled).toBe(true);
	expect(actions?.at(2)?.attributes?.destructive).toBe(true);
	invokeMenuAction(groups, "account:disabled", false);
	invokeMenuAction(groups, "account:selected", true);
	invokeMenuAction(groups, "account:selected", false);
	expect(calls).toEqual(["selected"]);
});
