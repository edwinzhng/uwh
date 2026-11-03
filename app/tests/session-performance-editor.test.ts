import { expect, test } from "bun:test";
import { sessionPerformanceDraft } from "../src/domain/session-performance-draft";

test("session drafts preserve unsaved edits for the same subject, session and author kind", (): void => {
	const draft = {
		...sessionPerformanceDraft(undefined, "player-a", "session-a", "coach"),
		rating: "8",
		comments: "Keep these edits after a failed save.",
		revision: 3,
	};
	expect(sessionPerformanceDraft(draft, "player-a", "session-a", "coach")).toBe(
		draft,
	);
	for (const [person, event, kind] of [
		["player-b", "session-a", "coach"],
		["player-a", "session-b", "coach"],
		["player-a", "session-a", "self"],
	] as const) {
		const next = sessionPerformanceDraft(draft, person, event, kind);
		expect(next.rating).toBeUndefined();
		expect(next.comments).toBe("");
		expect(next.revision).toBe(0);
	}
});

test("rating Save belongs to the stable sheet footer and the subject appears in its title", async (): Promise<void> => {
	const [editor, fields, form] = await Promise.all([
		Bun.file("src/features/session-performance-editor.tsx").text(),
		Bun.file("src/features/session-performance-fields.tsx").text(),
		Bun.file("src/features/use-session-performance-form.ts").text(),
	]);
	expect(editor).toContain("footer={");
	expect(editor).toContain("label={form.submitLabel}");
	expect(editor).toContain("onPress={form.submit}");
	expect(editor).toContain("person.name");
	expect(editor).toContain("!service.loadingCurrent");
	expect(fields).not.toContain("onPress={form.submit}");
	expect(form).toContain("if (readOnly) return");
	expect(form).toContain("validateSessionPerformance(values)");
	expect(form).toContain("operationKey(sessionPerformancePayload(values))");
});

test("permission editing blocks dismissal and input changes while the guarded request runs", async (): Promise<void> => {
	const editor = await Bun.file(
		"src/features/account-access-editor.tsx",
	).text();
	expect(editor).toContain("const task = useFormTask()");
	expect(editor).toContain("void task.submit(");
	expect(editor).toContain("if (!open && !task.busy) onClose()");
	expect(editor.match(/isDisabled=\{task.busy\}/g)).toHaveLength(4);
	expect(editor).toContain("{task.error}");
	expect(editor).toContain(
		"await setAccess(account.id, children, coaching, admin)",
	);
});

test("series sections retain their draft owners and share the sheet's dismissal guard", async (): Promise<void> => {
	const [manager, link] = await Promise.all([
		Bun.file("src/features/session-series-manager.tsx").text(),
		Bun.file("src/features/session-series-link.tsx").text(),
	]);
	expect(manager.match(/<Disclosure/g)).toHaveLength(4);
	expect(manager).toContain('title="Commitment"');
	expect(manager).toContain('title="Roster"');
	expect(manager).toContain('title="Sessions"');
	expect(manager).toContain(
		'series ? "Series settings" : "Set up committed roster"',
	);
	expect(manager).not.toContain("const task = useFormTask()");
	expect(link).toContain("const task = useFormTask()");
	expect(link).toContain("isDismissDisabled={task.busy}");
	expect(link).toContain("if (!task.busy) setOpen(value)");
	expect(link.match(/task=\{task\}/g)).toHaveLength(4);
});

test("sensitive profile and financial editors identify the player before editing", async (): Promise<void> => {
	const [coaching, ledger] = await Promise.all([
		Bun.file("src/features/player-coaching-form.tsx").text(),
		Bun.file("src/features/season-ledger-form.tsx").text(),
	]);
	expect(coaching).toContain("memberName(data, profile.personId)");
	expect(ledger).toMatch(/title=\{`[\s\S]*?personName/);
	expect(ledger).toContain("{seasonName}");
	expect(ledger).toContain(
		"Adds a permanent ledger entry. No money is transferred.",
	);
	expect(ledger.match(/isDisabled=\{busy\}/g)).toHaveLength(3);
});
