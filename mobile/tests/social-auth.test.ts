import { describe, expect, test } from "bun:test";
import { authRedirect, signInReturnPath } from "../src/domain/social-auth";

describe("sign-in return addresses", (): void => {
	const site = "https://club.example";
	test("keeps invitation and connection context", (): void => {
		expect(authRedirect("/join?invite=abc&revision=2", site)).toBe(
			`${site}/join?invite=abc&revision=2`,
		);
		expect(authRedirect("uwh-club://connect-account?request=abc", site)).toBe(
			"uwh-club://connect-account?request=abc",
		);
		expect(authRedirect("uwh-club://auth-callback", site)).toBe(
			"uwh-club://auth-callback",
		);
	});
	test("rejects external redirects and arbitrary deep links", (): void => {
		for (const path of [
			"https://club.example.evil.test",
			"//evil.test",
			"https://club.example@evil.test",
			"javascript:alert(1)",
			"uwh-club://account",
			"uwh-club://auth-callback.evil",
			"uwh-club://auth-callback/path",
			"https://user:password@club.example/",
		])
			expect(() => authRedirect(path, site)).toThrow();
	});
	test("avoids callback loops and external navigation", (): void => {
		expect(signInReturnPath("/join?invite=abc&revision=2")).toBe(
			"/join?invite=abc&revision=2",
		);
		expect(signInReturnPath("https://evil.test")).toBe("/account");
		expect(signInReturnPath("/auth-callback?code=123")).toBe("/account");
		expect(signInReturnPath("/connect-account?request=123")).toBe("/account");
	});
});
