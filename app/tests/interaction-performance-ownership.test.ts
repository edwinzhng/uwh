import { expect, test } from "bun:test";

test("closed dialog shells cannot register gestures, viewport observers, or stack listeners", async (): Promise<void> => {
	const shell = await Bun.file("src/design-system/dialog.tsx").text();
	for (const hook of [
		"useDialogStack",
		"useVisibleViewport",
		"useDialogDrag",
		"useSharedValue",
	])
		expect(shell).not.toContain(hook);
	expect(shell).toContain("!props.isOpen && !retained");
	expect(shell).toContain("props.onAfterClose?.()");
});
test("web material motion has no JavaScript frame clock and respects reduced motion", async (): Promise<void> => {
	const layer = await Bun.file(
		"src/design-system/material-layers.web.tsx",
	).text();
	expect(layer).not.toContain("react-native-reanimated");
	expect(layer).not.toContain("requestAnimationFrame");
	expect(
		await Bun.file("src/design-system/card-material-provider.web.tsx").text(),
	).toContain("prefers-reduced-motion:reduce");
	expect(layer).toContain('"running" : "paused"');
});
test("notification menus consume the shared unread owner instead of opening their own pagination", async (): Promise<void> => {
	const hook = await Bun.file("src/backend/use-inbox.ts").text();
	expect(hook).toContain("useSharedUnreadInbox()");
	expect(hook).not.toContain("automaticScans");
	const root = await Bun.file("app/_layout.tsx").text();
	expect(root).toContain("<InboxProvider>");
});
test("practice pages cannot mount energy collection or its review subscription", async (): Promise<void> => {
	for (const page of ["event-screen", "session-coaching"])
		expect(await Bun.file(`src/features/${page}.tsx`).text()).not.toContain(
			"SessionCheckIn",
		);
});

test("initial web markup keeps material CSS independent of generated React IDs", async (): Promise<void> => {
	const layer = await Bun.file(
		"src/design-system/material-layers.web.tsx",
	).text();
	expect(layer).not.toContain("useId");
	expect(
		await Bun.file("src/design-system/card-material-provider.web.tsx").text(),
	).toContain("@keyframes club-material-base");
	expect(await Bun.file("src/design-system/provider.tsx").text()).toContain(
		"!clientReady || (!loaded && !error)",
	);
});
