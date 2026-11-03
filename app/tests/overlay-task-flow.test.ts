import { expect, test } from "bun:test";
import {
	fitnessQuickLogSaveLabel,
	nextFitnessLogPerson,
} from "../src/domain/fitness-quick-log";
import { inviteEmail, inviteEmailError } from "../src/domain/invitations";

const featureSource = async (file: string): Promise<string> =>
	Bun.file(new URL(`../src/features/${file}.tsx`, import.meta.url)).text();

test("quick logging only offers next when another roster entry exists", (): void => {
	const people = [{ id: "first" }, { id: "last" }];
	expect(nextFitnessLogPerson(people, "first")).toBe("last");
	expect(nextFitnessLogPerson(people, "last")).toBeUndefined();
	expect(nextFitnessLogPerson(people, "missing")).toBeUndefined();
	expect(nextFitnessLogPerson([], "missing")).toBeUndefined();
	expect(fitnessQuickLogSaveLabel("last")).toBe("Save & next");
	expect(fitnessQuickLogSaveLabel(undefined)).toBe("Save result");
});

test("invitation submission validation shares backend normalization rules", (): void => {
	expect(inviteEmailError(" Edwin@Example.com ")).toBeUndefined();
	expect(inviteEmail(" Edwin@Example.com ")).toBe("edwin@example.com");
	for (const email of [
		"",
		"invalid",
		"a@b",
		"a b@example.com",
		`${"a".repeat(255)}@example.com`,
	]) {
		expect(inviteEmailError(email)).toBe("Enter a valid email.");
		expect(() => inviteEmail(email)).toThrow("Enter a valid email.");
	}
});

test("household primary actions stay outside the scrolling form body", async (): Promise<void> => {
	for (const [file, label] of [
		["guardian-invite-form", "Send invitation"],
		["household-profiles", "Create profile"],
	]) {
		const source = await featureSource(file ?? "");
		const footer = source.slice(
			source.indexOf("footer={"),
			source.indexOf("\n\t\t\t\t<Stack>", source.indexOf("footer={")),
		);
		expect(footer).toContain(`label="${label}"`);
		expect(source).toContain("isDismissDisabled={task.busy}");
		expect(source).toContain("useFormTask()");
	}
});

test("program coach removal only changes the draft until Save", async (): Promise<void> => {
	const source = await featureSource("program-coaching-editor");
	expect(source).not.toContain("ConfirmButton");
	const toggleStart = source.indexOf("onToggle={");
	const toggleEnd = source.indexOf("\n\t\t\t\t/>", toggleStart);
	const toggle = source.slice(toggleStart, toggleEnd);
	const draftChange = source.slice(
		source.indexOf("const change ="),
		source.indexOf("const save ="),
	);
	expect(toggleStart).toBeGreaterThan(source.indexOf("<MultiSelect"));
	expect(toggle).toContain("change(");
	expect(toggle).toContain("? [...selected, id]");
	expect(toggle).toContain(": selected.filter((entry) => entry !== id)");
	expect(toggle).not.toContain("state.save");
	expect(draftChange).toContain("setDraft(");
	expect(draftChange).not.toContain("state.save");
	expect(source.match(/state\.save\(/g)).toHaveLength(1);
	expect(source).toContain("state.save(draft)");
	expect(source.replace(/\s+/g, " ")).toContain(
		"Additions and removals apply when you save",
	);
});

test("queued invitations close without a redundant success form or delivery claim", async (): Promise<void> => {
	const source = await featureSource("invite-member-action");
	expect(source).toContain("useFormTask()");
	expect(source).toContain("inviteEmailError(email)");
	expect(source).toContain(
		'actionToast("sentInvite", "success", { subject: address })',
	);
	expect(source.indexOf("setOpen(false)")).toBeGreaterThan(
		source.indexOf("await backend.invites.create"),
	);
	expect(source).not.toContain('label="Done"');
	expect(source).not.toContain("setSent");
	expect(source).not.toContain("validationError=");
});

test("the final swim entry has an explicit completion state instead of clearing a stale entry", async (): Promise<void> => {
	const source = await featureSource("fitness-quick-log-form");
	expect(source).toContain(
		'title={completed ? "Result saved" : "Log swim results"}',
	);
	expect(source).toContain("else setCompleted(true)");
	expect(source).toContain('label="Log another result"');
	expect(source).not.toContain("?.id ?? selected.id");
});

test("reviewer guidance describes program assignments, not weekday rosters", async (): Promise<void> => {
	const source = await featureSource("development-reviewers");
	expect(source).toContain("program coaching assignment");
	expect(source).not.toContain("weekly backups");
	expect(source).not.toContain("weekday assignment");
});
