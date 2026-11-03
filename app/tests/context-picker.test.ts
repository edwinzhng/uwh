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

test("context menus preserve option, disabled and selection contracts", async (): Promise<void> => {
	const picker = await Bun.file(
		new URL("../src/design-system/context-picker.tsx", import.meta.url),
	).text();
	expect(picker).toContain('appearance="context"');
	expect(picker).toContain("next !== undefined && next !== value");
	expect(picker).toContain("!options.some((option) => !option.isDisabled)");
	for (const filename of [
		"tabs.tsx",
		"segmented-control.tsx",
		"section-navigation.tsx",
	])
		expect(
			await Bun.file(`src/design-system/${filename}`).text(),
		).not.toContain("<ContextPicker");
	const trigger = await Bun.file(
		new URL("../src/design-system/context-trigger.tsx", import.meta.url),
	).text();
	expect(trigger).toContain("minHeight: geometry.touch");
	expect(trigger).toContain("expanded: isOpen");
	expect(trigger).toContain('aria-haspopup="dialog"');
	expect(trigger).toContain("onFocus=");
	expect(trigger).not.toContain("numberOfLines");
	expect(trigger).not.toContain("withTiming");
	const row = await Bun.file(
		new URL("../src/design-system/popup-row.tsx", import.meta.url),
	).text();
	expect(row).toContain("aria-checked={isChecked ?? isSelected}");
});

test("Home uses a workspace menu, profile keeps combined sections, and inbox filter sits beside search", async (): Promise<void> => {
	const home = await Bun.file(
		new URL("../src/features/home-screen.tsx", import.meta.url),
	).text();
	expect(home).toContain('label="Home workspace"');
	expect(home).toContain('{ value: "personal", label: "Player" }');
	expect(home).toContain('{ value: "coaching", label: "Coach" }');
	expect(home).toContain("canCoach(account)");
	expect(home).toContain("router.setParams({ view: value })");
	const account = await Bun.file(
		new URL("../src/features/account-screen.tsx", import.meta.url),
	).text();
	expect(account).toContain("compactNavigation={{");
	expect(account).toContain("options: accountSections");
	const inbox = await Bun.file(
		new URL("../src/features/conversation-list.tsx", import.meta.url),
	).text();
	expect(inbox).not.toContain("SegmentedControl");
	expect(inbox.indexOf("<ContextPicker")).toBeLessThan(
		inbox.indexOf("{action}"),
	);
});
