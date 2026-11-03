import { expect, test } from "bun:test";
import { eventDateParts } from "../src/domain/event-card-presentation";

test("event date blocks retain the calendar day without device timezone drift", (): void => {
	expect(eventDateParts("2026-10-29")).toEqual({
		weekday: "Thu",
		day: "29",
		month: "Oct",
	});
	expect(eventDateParts("2027-01-01")).toEqual({
		weekday: "Fri",
		day: "1",
		month: "Jan",
	});
	expect(eventDateParts("2028-02-29")).toEqual({
		weekday: "Tue",
		day: "29",
		month: "Feb",
	});
});

test("event cards use one linked title summary and one lightweight preview row", async (): Promise<void> => {
	const card = await Bun.file("src/features/household-event-card.tsx").text();
	const summary = await Bun.file("src/design-system/event-summary.tsx").text();
	expect(card).toContain("<EventSummary");
	expect(card).toContain("<EventPreviewActions");
	expect(card).not.toContain("More details");
	expect(summary).toContain("<Link href={href} asChild>");
	expect(summary).toContain('accessibilityRole="link"');
	expect(summary).not.toContain('name="clock"');
});

test("previews load live session data only on demand and keep teams read only", async (): Promise<void> => {
	const preview = await Bun.file(
		"src/features/event-preview-actions.tsx",
	).text();
	const teams = await Bun.file("src/features/team-panel.tsx").text();
	expect(preview).toContain("{open ? (");
	expect(preview).toContain("useQuery(api.club.current");
	expect(preview).toContain('screen: "session"');
	expect(preview).toContain("workspace.clubId !== app.workspaceId");
	expect(preview).toContain("plan.published");
	expect(preview).toContain(".includes(person.id)");
	expect(preview).toContain(
		"<TeamPool plan={plan} side={side} group={group} />",
	);
	expect(teams).toContain("(!readOnly || entry.published)");
});

test("quick response keeps the existing mutation rules, duplicate guard, sections and reserved absence flow", async (): Promise<void> => {
	const response = await Bun.file(
		"src/features/response-control-content.tsx",
	).text();
	const series = await Bun.file(
		"src/features/series-response-control.tsx",
	).text();
	expect(response).toContain("const task = useFormTask()");
	expect(response).toContain('type: "respond"');
	expect(response).toContain("going ? current.partIds : undefined");
	expect(response).toContain("if (!saved) throw new Error");
	expect(response).toContain("<SectionResponsePicker");
	expect(series).toContain("<QuickResponseButtons");
	expect(series).toContain('if (value === "unavailable")');
	expect(series).toContain("quick && (scheduled || locked)");
	expect(series).toContain("Invited when registration opens");
	expect(series).toContain("setOpen(true)");
	expect(series).toContain('label="Reason for not going"');
});

test("bottom navigation reuses the interruptible selection animation", async (): Promise<void> => {
	const indicator = await Bun.file(
		"src/design-system/navigation-indicator.tsx",
	).text();
	expect(indicator).toContain("<SelectionIndicator");
	expect(indicator).toContain("value={value}");
	expect(indicator).toContain("radius={corners.pill}");
});

test("quick responses highlight both choices and preview buttons form a right-aligned group", async (): Promise<void> => {
	const [response, actions, button] = await Promise.all([
		Bun.file("src/features/quick-response-buttons.tsx").text(),
		Bun.file("src/features/event-preview-actions.tsx").text(),
		Bun.file("src/design-system/button-control.tsx").text(),
	]);
	expect(response).toContain(
		'response === "unavailable" ? "danger" : "secondary"',
	);
	expect(response).toContain('prefix="close"');
	expect(actions).toContain('label="My team"');
	expect(actions).toContain('variant="ghost"');
	expect(button).toContain("aria-pressed={isSelected}");
});

test("compact cards use the active profile and keep independent section colors local", async (): Promise<void> => {
	const [card, row, summary] = await Promise.all([
		Bun.file("src/features/household-event-card.tsx").text(),
		Bun.file("src/design-system/event-response-row.tsx").text(),
		Bun.file("src/design-system/event-summary.tsx").text(),
	]);
	expect(card).toContain("useActivePerson()");
	expect(card).toContain("eventResponse(data, event.id, person.id)");
	expect(card).toContain("<EventResponseRow");
	expect(row).toContain("theme[tone].background");
	expect(row).not.toContain("<Avatar");
	expect(summary).toContain('variant="overline"');
	expect(summary).toContain("borderRightWidth");
});
