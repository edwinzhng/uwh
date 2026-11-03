import { expect, test } from "bun:test";

test("route failures have an inherited screen boundary and a provider-independent root boundary", async (): Promise<void> => {
	const root = await Bun.file("app/_layout.tsx").text();
	const boundary = await Bun.file("src/features/app-error-boundary.tsx").text();
	expect(root).toContain("screenErrorBoundary: ScreenErrorBoundary");
	expect(root).toContain("AppErrorBoundary as ErrorBoundary");
	expect(boundary).toContain("<DesignProvider>");
	expect(boundary).not.toContain("BackendProvider");
	expect(boundary).not.toContain("useApp(");
	expect(boundary).not.toContain("signOut");
});

test("recovery uses the shared static screen and guarded retry without exposing raw errors", async (): Promise<void> => {
	const boundary = await Bun.file(
		"src/features/screen-error-boundary.tsx",
	).text();
	const screen = await Bun.file("src/design-system/recovery-screen.tsx").text();
	expect(boundary).toContain("useTask()");
	expect(boundary).toContain("task.run(retry)");
	expect(boundary).not.toContain("error.message");
	expect(screen).toContain("SafeAreaView");
	expect(screen).toContain('accessibilityRole="alert"');
	expect(screen).toContain('label="Try again"');
	expect(screen).toContain("Couldn’t load this screen");
	expect(screen).not.toContain("HomeBackground");
	expect(screen).not.toContain("Animated");
});
