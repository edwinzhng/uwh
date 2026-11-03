import { expect, test } from "bun:test";
import {
	type SessionDrill,
	validateSessionPlan,
} from "../src/domain/session-plan";

const drill: SessionDrill = {
	id: "drill",
	title: "Passing",
	minutes: 10,
	instructions: "",
	media: [],
};

test("isolated drill validation exposes the same submitted issues as plan validation", (): void => {
	for (const entry of [
		{ ...drill, title: "" },
		{ ...drill, minutes: 0 },
		{ ...drill, instructions: "a".repeat(2001) },
	]) {
		const error = validateSessionPlan({
			objective: "",
			notes: "",
			drills: [entry],
		});
		expect(error).toBeTruthy();
		expect(error).toBe(
			validateSessionPlan({
				objective: "Team play",
				notes: "Private notes",
				drills: [entry],
			}),
		);
	}
	expect(
		validateSessionPlan({ objective: "", notes: "", drills: [drill] }),
	).toBeUndefined();
});

test("errors reveal only after Save and identify the affected drill without resetting its toggle or draft", async (): Promise<void> => {
	const editor = await Bun.file(
		new URL("../src/features/session-plan-editor.tsx", import.meta.url),
	).text();
	const source = await Bun.file(
		new URL("../src/features/session-drill-editor.tsx", import.meta.url),
	).text();
	expect(editor).toContain(
		"const [revealErrors, setRevealErrors] = useState(false)",
	);
	expect(editor.indexOf("setRevealErrors(true)")).toBeLessThan(
		editor.indexOf("void task.submit("),
	);
	expect(editor).toContain("revealErrors={revealErrors}");
	expect(editor).toContain("setRevealErrors(false)");
	expect(source).toContain("revealErrors");
	expect(source).toContain(
		'validateSessionPlan({ objective: "", notes: "", drills: [drill] })',
	);
	expect(source).toContain("isOpen={expanded || Boolean(error)}");
	expect(source).toContain("if (!error) setExpanded(open)");
	expect(source).toContain("if (error) setExpanded(true)");
	expect(source).toContain("Drill " + "$" + "{index + 1}");
	expect(source).not.toContain("key={error}");
});
