import { expect, test } from "bun:test";

test("Schedule uses program-name filters and a simple agenda while keeping calendar export and authorized creation", async (): Promise<void> => {
	const agenda = await Bun.file("src/features/agenda-screen.tsx").text();
	expect(agenda).toContain('label="All programs"');
	expect(agenda).not.toContain("<Tabs");
	expect(agenda).toContain("label={program.name}");
	expect(agenda).not.toContain('label="Schedule view"');
	expect(agenda).not.toContain('label="Event type"');
	expect(agenda).toContain("<CalendarExportButton />");
	expect(agenda).toContain('label="New event"');
	expect(agenda).toContain("account.admin");
});
