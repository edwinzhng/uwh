import { describe, expect, test } from "bun:test";
import type { InboxTarget } from "../src/domain/inbox";
import { notificationPayload } from "../src/domain/notification-payload";
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
			"/announcements",
			"/member?id=sam&tab=goals",
			"/club",
			"/schedule",
		])
			expect(notificationPath(path)).toBe(path);
	});
	test("every generated activity destination survives native and browser tap validation", (): void => {
		const targets: InboxTarget[] = [
			{ kind: "message", threadId: "room%3Aclub", messageId: "message-1" },
			{ kind: "event", eventId: "series~2026-11-05" },
			{ kind: "event", eventId: "event-1", tab: "people", partId: "hockey" },
			{ kind: "resource", resourceId: "resource-1" },
			{ kind: "feedback", personId: "player-1", tab: "progress" },
			{ kind: "feedback", personId: "player-1", tab: "feedback" },
			{ kind: "feedback", personId: "player-1", tab: "shoutouts" },
			{ kind: "announcement", noticeId: "notice-1" },
		];
		for (const target of targets) {
			const payload = notificationPayload(
				{ kind: "announcements", entityId: "source-1" },
				{
					kind: "announcements",
					title: "Private",
					description: "Private",
					target,
				},
			);
			expect(notificationPath(payload.path)).toBe(payload.path);
		}
		expect(notificationPath("/messages?tab=notices")).toBe("/announcements");
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
