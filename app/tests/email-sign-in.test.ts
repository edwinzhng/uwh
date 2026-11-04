import { expect, test } from "bun:test";
import {
	signInEmailError,
	validEmailSignInCode,
	validEmailSignInToken,
} from "../src/domain/email-sign-in";
import { authRedirect } from "../src/domain/social-auth";

test("passwordless sign-in validates email and only accepts high-entropy link tokens", (): void => {
	expect(signInEmailError(" someone@example.test ")).toBeUndefined();
	expect(signInEmailError("broken")).toBeDefined();
	expect(validEmailSignInToken("abcdef0123456789ABCDEF0123456789")).toBe(true);
	for (const value of [
		undefined,
		"123456",
		"",
		"x".repeat(31),
		"x".repeat(33),
		`${"x".repeat(31)}_`,
	])
		expect(validEmailSignInToken(value)).toBe(false);
});
test("email links allow only the app callback or same-site destinations", (): void => {
	expect(authRedirect("uwh-club://email-sign-in", "https://club.example")).toBe(
		"uwh-club://email-sign-in",
	);
	expect(authRedirect("/email-sign-in", "https://club.example")).toBe(
		"https://club.example/email-sign-in",
	);
	for (const target of [
		"https://other.example/email-sign-in",
		"uwh-club://email-sign-in/extra",
		"uwh-club://other",
		"javascript:alert(1)",
	])
		expect(() => authRedirect(target, "https://club.example")).toThrow();
});

test("email codes accept exactly six digits, including leading zeroes", (): void => {
	for (const value of ["000001", "123456", " 012345 "])
		expect(validEmailSignInCode(value)).toBe(true);
	for (const value of ["", "12345", "1234567", "12a456", "123 45"])
		expect(validEmailSignInCode(value)).toBe(false);
});
