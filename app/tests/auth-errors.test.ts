import { expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { passwordErrorMessage } from "../convex/auth_errors";
import { friendlyError } from "../src/backend/errors";

test("password failures use the same safe message for absent accounts and wrong passwords", (): void => {
	for (const code of [
		"InvalidAccountId",
		"InvalidSecret",
		"Invalid credentials",
	]) {
		const message = passwordErrorMessage(new Error(code));
		expect(message).toBe("Incorrect email or password.");
		expect(friendlyError(new ConvexError(message ?? ""))).toBe(
			"Incorrect email or password.",
		);
	}
});

test("expected authentication failures explain the next step", (): void => {
	expect(passwordErrorMessage(new Error("TooManyFailedAttempts"))).toContain(
		"wait a few minutes",
	);
	expect(passwordErrorMessage(new Error("Could not verify code"))).toContain(
		"Request a new code",
	);
	expect(passwordErrorMessage(new Error("Use at least 12 characters."))).toBe(
		"Use at least 12 characters.",
	);
});

test("unexpected errors do not expose backend details", (): void => {
	for (const message of [
		"[CONVEX A(auth:signIn)] [Request ID: secret] Server Error",
		"Uncaught Error: internal database detail\n at handler (auth.ts:42)",
	]) {
		expect(friendlyError(new Error(message))).toBe(
			"Something went wrong. Please try again.",
		);
		expect(passwordErrorMessage(new Error(message))).toBeUndefined();
	}
	expect(friendlyError(new Error("Failed to fetch"))).toContain(
		"internet connection",
	);
});
