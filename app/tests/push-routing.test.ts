import { describe, expect, test } from "bun:test";
import { notificationPath } from "../src/domain/push-routing";

describe("notification routes", (): void => {
	test("opens only supported club destinations", (): void => {
		for (const path of [
			"/conversation?id=club",
			"/session?id=practice-2026",
			"/progress",
			"/member?id=sam&tab=progress",
			"/member?id=sam&tab=feedback",
			"/member?id=sam&tab=shoutouts",
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
			"/conversation?id=room%3Astaff",
			"/conversation?id=%72%6f%6f%6d%3astaff",
			"/conversation?id=bad%escape",
			"/session",
			"javascript:alert(1)",
			undefined,
			{},
		])
			expect(notificationPath(path)).toBeUndefined();
	});
});
