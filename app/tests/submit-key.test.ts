import { expect, test } from "bun:test";
import { isSubmitKey } from "../src/design-system/submit-key";

test("Enter submits while Shift+Enter keeps a newline", (): void => {
	expect(isSubmitKey({ key: "Enter" })).toBe(true);
	expect(isSubmitKey({ key: "Enter", shiftKey: true })).toBe(false);
	expect(isSubmitKey({ key: "a" })).toBe(false);
});

test("confirming composed text never sends the message", (): void => {
	expect(isSubmitKey({ key: "Enter", isComposing: true })).toBe(false);
	expect(isSubmitKey({ key: "Enter", keyCode: 229 })).toBe(false);
	expect(isSubmitKey({ key: "Enter", isComposing: false, keyCode: 13 })).toBe(
		true,
	);
});
