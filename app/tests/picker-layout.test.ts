import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pickerTriggerWidth } from "../src/design-system/picker-layout";
import { PopupStyles } from "../src/design-system/popup-styles.web";
import { geometry, lightTheme } from "../src/design-system/tokens";

test("dialog form pickers fill their available width without expanding action menus", (): void => {
	expect(pickerTriggerWidth({})).toBe(geometry.popupWidth);
	expect(pickerTriggerWidth({ inDialog: true })).toBe("100%");
	for (const availableWidth of [148, 312, 688])
		expect(pickerTriggerWidth({ inDialog: true, availableWidth })).toBe(
			availableWidth,
		);
	for (const availableWidth of [0, -4, Number.NaN, Number.POSITIVE_INFINITY])
		expect(pickerTriggerWidth({ inDialog: true, availableWidth })).toBe("100%");
	expect(pickerTriggerWidth({ inDialog: true, kind: "action" })).toBe(
		geometry.popupWidth,
	);
	for (const inDialog of [false, true]) {
		expect(pickerTriggerWidth({ inDialog, compact: true })).toBe(
			geometry.compactPickerWidth,
		);
		expect(
			pickerTriggerWidth({ inDialog, availableWidth: 312, compact: true }),
		).toBe(geometry.compactPickerWidth);
		expect(pickerTriggerWidth({ inDialog, icon: true })).toBe(geometry.touch);
		expect(pickerTriggerWidth({ inDialog, compact: true, icon: true })).toBe(
			geometry.touch,
		);
	}
});

test("web select and combobox share the readable field boundary", (): void => {
	const styles = renderToStaticMarkup(createElement(PopupStyles));
	const fields = styles
		.match(/\.club-picker-trigger, \.club-combo \{([^}]+)\}/)
		?.at(1);
	expect(fields).toContain(
		`border:${geometry.border}px solid ${lightTheme.controlBorder}`,
	);
	expect(styles).toContain(
		'[role="dialog"] .club-picker-trigger[data-picker]:not([data-compact]), [role="dialog"] .club-combo { width:100%; }',
	);
});

test("native field triggers retain shared boundaries and phone focus corners", async (): Promise<void> => {
	for (const file of [
		"src/design-system/picker-trigger.tsx",
		"src/design-system/native-menu-trigger.tsx",
	]) {
		const source = await Bun.file(file).text();
		expect(source).toContain("theme.controlBorder");
		expect(source).toContain("pickerTriggerWidth({");
	}
	const navigation = await Bun.file(
		"src/design-system/navigation-control.tsx",
	).text();
	expect(navigation).toContain(
		"borderRadius: vertical ? corners.pill : corners.navigation",
	);
	expect(navigation).not.toContain("borderRadius: vertical ? 0");
});

test("compact schedule cards stay flat while team elevation stays explicit", async (): Promise<void> => {
	const surface = await Bun.file("src/design-system/surface.tsx").text();
	expect(surface).toMatch(/elevation:\s*level\s*=\s*"none"/);
	expect(
		await Bun.file("src/features/household-event-card.tsx").text(),
	).not.toContain('elevation="raised"');
	expect(await Bun.file("src/features/team-side.tsx").text()).toContain(
		'elevation="raised"',
	);
});
