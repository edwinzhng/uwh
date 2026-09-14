import { describe, expect, test } from "bun:test";
import { notificationPath } from "../src/domain/push-routing";

describe("notification routes", (): void => {
	test("opens only supported club destinations", (): void => {
		for (const path of [
			"/conversation?id=club",
			"/session?id=practice-2026",
			"/progress",
			"/member?id=sam&tab=progress",
			"/messages?tab=notices",
			"/club",
			"/schedule",
		])
			expect(notificationPath(path)).toBe(path);
	});
	test("rejects external, obsolete, privileged and malformed routes", (): void => {
		for (const path of [
			"https://example.com",
			"//example.com",
			"/event?id=x",
			"/administration",
			"/member?id=sam&tab=admin",
			"/conversation?id=x&redirect=https://example.com",
			"/session",
			"javascript:alert(1)",
			undefined,
			{},
		])
			expect(notificationPath(path)).toBeUndefined();
	});
});
