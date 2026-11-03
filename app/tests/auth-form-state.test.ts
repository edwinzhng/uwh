import { expect, test } from "bun:test";
import {
	type AuthFields,
	authBackStep,
	authParameters,
	authPresentation,
	isResetCodeFailure,
	validateAuthStep,
} from "../src/features/auth-form-state";

const fields: AuthFields = {
	email: " MEMBER@example.test ",
	name: " Member ",
	password: "Strong password 123",
	confirmation: "Strong password 123",
	code: "123456",
};

test("reset email, code and password are separate steps and code Continue never sends a verification request", (): void => {
	expect(authParameters("reset", fields)).toEqual({
		flow: "reset",
		email: "member@example.test",
	});
	expect(authPresentation.resetCode.password).toBe(false);
	expect(authPresentation.resetCode.submit).toBe("Continue");
	expect(authParameters("resetCode", fields)).toBeUndefined();
	expect(
		validateAuthStep("resetCode", {
			...fields,
			password: "",
			confirmation: "",
		}),
	).toBeUndefined();
	expect(authPresentation.resetPassword.code).toBe(false);
	expect(authParameters("resetPassword", fields)).toEqual({
		flow: "reset-verification",
		email: "member@example.test",
		newPassword: fields.password,
		code: "123456",
	});
});

test("signup and final reset require confirmation but never send it to the server", (): void => {
	for (const step of ["signUp", "resetPassword"] as const) {
		expect(validateAuthStep(step, { ...fields, confirmation: "" })).toBe(
			"Confirm your password",
		);
		expect(
			validateAuthStep(step, { ...fields, confirmation: "Different password" }),
		).toBe("Passwords don’t match");
		expect(validateAuthStep(step, fields)).toBeUndefined();
		expect(authParameters(step, fields)).not.toHaveProperty("confirmation");
	}
	expect(
		validateAuthStep("signIn", {
			...fields,
			password: "old",
			confirmation: "",
		}),
	).toBeUndefined();
});

test("reset retains a real six-digit code for final server verification and validates bounded passwords", (): void => {
	for (const code of ["", "12345", "1234567", "abcdef"])
		for (const step of ["resetCode", "resetPassword"] as const)
			expect(validateAuthStep(step, { ...fields, code })).toBe(
				"Enter the 6-digit code",
			);
	expect(
		validateAuthStep("resetPassword", { ...fields, password: "short" }),
	).toBe("Use at least 12 characters");
	expect(
		validateAuthStep("resetPassword", { ...fields, password: "x".repeat(257) }),
	).toBe("Use 256 characters or fewer");
	expect(
		validateAuthStep("resetPassword", {
			...fields,
			password: "x".repeat(256),
			confirmation: "x".repeat(256),
		}),
	).toBeUndefined();
	expect(validateAuthStep("reset", { ...fields, email: "not-an-email" })).toBe(
		"Enter a valid email address",
	);
});

test("Back follows the reset steps and invalid-code routing never mistakes a network or password error for verification", (): void => {
	expect(authBackStep("resetPassword")).toBe("resetCode");
	expect(authBackStep("resetCode")).toBe("reset");
	expect(authBackStep("reset")).toBe("signIn");
	expect(authBackStep("verify")).toBe("signIn");
	for (const message of [
		"Invalid or expired code. Request a new code.",
		"Could not verify code",
		"Incorrect email or password.",
	])
		expect(isResetCodeFailure(message)).toBe(true);
	for (const message of [
		"Check your internet connection and retry.",
		"Use at least 12 characters.",
		"Too many attempts. Try again later.",
	])
		expect(isResetCodeFailure(message)).toBe(false);
});
