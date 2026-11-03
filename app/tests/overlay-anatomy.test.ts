import { expect, test } from "bun:test";

test("disclosure retains mounted field state and exposes a named expanded control", async (): Promise<void> => {
	const source = await Bun.file("src/design-system/disclosure.tsx").text();
	expect(source).toContain('accessibilityRole="button"');
	expect(source).toContain("expanded: open");
	expect(source).toContain("aria-controls={id}");
	expect(source).toContain('display: open ? "flex" : "none"');
	expect(source).toContain("{children}");
	expect(source).not.toContain("open ? children");
});

test("event registration details remain progressive", async (): Promise<void> => {
	const event = await Bun.file("src/features/event-editor.tsx").text();
	expect(event).toContain('title="Registration & details"');
	expect(event).toContain("registrationOpen || Boolean(error || task.error)");
});

test("production preferences exclude avatar experiments and empty block management", async (): Promise<void> => {
	const source = await Bun.file(
		"src/features/account-settings-screen.tsx",
	).text();
	expect(source).not.toContain("Avatar style");
	expect(source).not.toContain("BlockedAccounts");
	const messaging = await Bun.file("src/features/messages-screen.tsx").text();
	expect(messaging).toContain("safety.status?.blocked.length");
	expect(messaging).toContain("<BlockedAccounts");
});
