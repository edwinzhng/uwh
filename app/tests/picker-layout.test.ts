import { expect, test } from "bun:test";
import { pickerTriggerWidth } from "../src/design-system/picker-layout";
import { geometry } from "../src/design-system/tokens";

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
