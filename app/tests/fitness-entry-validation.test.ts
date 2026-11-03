import { expect, test } from "bun:test";
import { fitnessEntriesError } from "../src/domain/fitness-model";

test("fitness entry validation is shared across form, preview and backend", () => {
	const entry = { personId: "sam", value: "0", notes: "" };
	expect(fitnessEntriesError("count", [entry])).toBeUndefined();
	expect(
		fitnessEntriesError("count", [{ ...entry, value: "" }]),
	).toBeUndefined();
	expect(
		fitnessEntriesError("count", [
			{ ...entry, value: "", notes: "Needs a result" },
		]),
	).toContain("Add a result");
	expect(fitnessEntriesError("time", [entry])).toContain("Enter a time");
	expect(
		fitnessEntriesError("pass_fail", [{ ...entry, value: "fail" }]),
	).toBeUndefined();
	expect(fitnessEntriesError("count", [entry, entry])).toContain(
		"different players",
	);
	expect(fitnessEntriesError("count", [])).toContain("25");
	expect(
		fitnessEntriesError("count", [{ ...entry, notes: "a".repeat(1001) }]),
	).toContain("1,000");
});
