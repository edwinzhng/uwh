import { expect, test } from "bun:test";
import { validToastCopy } from "./check-toast-copy";

test("allows concise verb-first action copy", (): void => {
	for (const message of [
		"Saved profile",
		"Sent invite",
		"Signed out",
		"Retry action",
	])
		expect(validToastCopy(message)).toBe(true);
});
test("rejects filler, punctuation, missing actions and long copy", (): void => {
	for (const message of [
		"Success!",
		"Profile saved",
		"Saved",
		"Saved your profile successfully",
		"Sent message.",
		"Saved every single profile in the entire club",
	])
		expect(validToastCopy(message)).toBe(false);
});
