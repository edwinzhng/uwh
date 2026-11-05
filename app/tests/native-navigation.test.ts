import { expect, test } from "bun:test";
import {
	nativeDetailRoute,
	nativeRouteTitle,
	nativeStackAnimation,
} from "../src/design-system/native-navigation-model";

test("native detail pages retain stack navigation without exposing a fifth primary tab", (): void => {
	for (const name of [
		"account-settings",
		"session",
		"member",
		"conversation",
		"fitness",
	])
		expect(nativeDetailRoute(name)).toBe(true);
	for (const name of [
		"",
		"(tabs)",
		"index",
		"messages",
		"schedule",
		"club",
		"account",
		"join",
		"auth-callback",
		"review-auth",
		"otp-test",
	])
		expect(nativeDetailRoute(name)).toBe(false);
	expect(nativeRouteTitle("member")).toBe("Profile");
	expect(nativeRouteTitle("account-settings")).toBe("Account settings");
	expect(nativeRouteTitle("resources")).toBe("Resources");
});

test("native detail entries use the system push while primary destinations and reduced motion remain instant", (): void => {
	for (const name of [
		"conversation",
		"session",
		"member",
		"account-settings",
	]) {
		expect(nativeStackAnimation(name, true)).toBe("default");
		expect(nativeStackAnimation(name, false)).toBe("none");
	}
	for (const name of [
		"(tabs)",
		"index",
		"messages",
		"schedule",
		"club",
		"join",
	])
		expect(nativeStackAnimation(name, true)).toBe("none");
});
