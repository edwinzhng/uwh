import { expect, test } from "bun:test";
import {
	fitnessQuickLogSaveLabel,
	nextFitnessLogPerson,
} from "../src/domain/fitness-quick-log";
import { inviteEmail, inviteEmailError } from "../src/domain/invitations";

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
