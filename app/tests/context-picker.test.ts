import { expect, test } from "bun:test";
import { contextPickerPresentation } from "../src/design-system/context-picker-model";
import { geometry } from "../src/design-system/tokens";

test("context switches use native menus on iOS and Android, sheets on narrow web, and desktop popovers", (): void => {
	for (const platform of ["ios", "android", "web"])
		for (const width of [320, 390, 844, 899, 900, 1280]) {
			expect(
				contextPickerPresentation({
					platform,
					width,
					breakpoint: geometry.wide,
					requested: "automatic",
				}),
			).toBe(platform === "web" && width < geometry.wide ? "sheet" : "menu");
			expect(
				contextPickerPresentation({
					platform,
					width,
					breakpoint: geometry.wide,
					requested: "sheet",
				}),
			).toBe("sheet");
		}
});
