import { expect, test } from "bun:test";
import {
	nativeHeaderRoute,
	nativeRouteTitle,
} from "../src/design-system/native-navigation-model";

test("native detail pages keep native back controls without exposing a fifth primary tab", (): void => {
	for (const name of [
		"account-settings",
		"session",
		"member",
		"conversation",
		"fitness",
	])
		expect(nativeHeaderRoute(name)).toBe(true);
	for (const name of [
		"",
		"(tabs)",
		"account",
		"join",
		"auth-callback",
		"review-auth",
		"otp-test",
	])
		expect(nativeHeaderRoute(name)).toBe(false);
	expect(nativeRouteTitle("member")).toBe("Profile");
	expect(nativeRouteTitle("account-settings")).toBe("Account settings");
	expect(nativeRouteTitle("resources")).toBe("Resources");
});
