import { expect, test } from "bun:test";
import { darkTheme, lightTheme } from "../src/design-system/tokens";

test("page canvases and cards retain separate surfaces", (): void => {
	expect(lightTheme.background.canvas).toBe("#F7F8F5");
	expect(darkTheme.background.canvas).toBe("#121812");
	expect(darkTheme.background.primary).not.toBe(darkTheme.background.canvas);
});

test("account presentation is a retained shared sheet on both native platforms and web", async (): Promise<void> => {
	for (const platform of ["ios", "android", "web"])
		expect(
			await Bun.file(`src/design-system/person-picker.${platform}.tsx`).text(),
		).toContain('"./person-picker-fallback"');
	const account = await Bun.file(
		"src/design-system/person-picker-fallback.tsx",
	).text();
	for (const expected of [
		"<Dialog",
		'title="Profiles"',
		'label="View profile"',
		'label="Settings"',
		'label="Sign out"',
		"options.map",
	])
		expect(account).toContain(expected);
});

test("compact toolbar uses guarded native buttons, one group and no mobile branding", async (): Promise<void> => {
	for (const platform of ["ios", "android"]) {
		const adapter = await Bun.file(
			`src/design-system/toolbar-button.${platform}.tsx`,
		).text();
		expect(adapter).toContain('nativeFeatureAvailable("ExpoUI")');
		expect(adapter).toContain("lazy(");
	}
	const layout = await Bun.file("src/design-system/app-layout.tsx").text();
	expect(layout).toContain("<ToolbarGroup>");
	const mobile = layout.slice(layout.indexOf("{!nativeHeader && (!workspace"));
	expect(mobile).not.toContain("<BrandIdentity");
	const navigation = await Bun.file(
		"src/design-system/main-tabs.native.tsx",
	).text();
	expect(navigation).toContain(
		'<NativeTabs.Trigger.Icon sf="shield" md="shield" />',
	);
});

test("empty notifications show one quiet message without a decorative empty-state panel", async (): Promise<void> => {
	const source = await Bun.file("src/features/notifications-menu.tsx").text();
	expect(source).not.toContain("EmptyState");
	expect(source).not.toContain('description="You’re all caught up."');
	expect(source).toContain('label="Past notifications"');
});
