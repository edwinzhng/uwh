import { expect, test } from "bun:test";
import type { Conversation } from "../src/domain/app-types";
import {
	conversationCategory,
	conversationKind,
	isDirectThread,
} from "../src/domain/messaging";

const thread = (
	id: string,
	values: Partial<Conversation> = {},
): Conversation => ({
	id,
	title: "Chat",
	subtitle: "",
	accountIds: ["one", "two"],
	...values,
});

test("the inbox has only DMs, groups and channels without changing managed audiences", (): void => {
	for (const id of [
		"club",
		"youth",
		"room:staff",
		"room:program:training",
		"session:event",
		"session",
	])
		expect(conversationCategory(thread(id))).toBe("channel");
	expect(conversationCategory(thread("dm-one-two"))).toBe("direct");
	expect(conversationCategory(thread("named", { kind: "group" }))).toBe(
		"group",
	);
	expect(conversationCategory(thread("two-person-group"))).toBe("group");
});

test("explicit chat kinds beat legacy ID heuristics but cannot override managed rooms or event identities", (): void => {
	expect(conversationKind(thread("session:old", { kind: "group" }))).toBe(
		"group",
	);
	expect(conversationKind(thread("dm-old", { kind: "group" }))).toBe("group");
	expect(
		conversationKind(thread("event", { eventId: "event", kind: "direct" })),
	).toBe("event");
	expect(conversationKind(thread("club", { kind: "direct" }))).toBe("general");
	expect(conversationKind(thread("room:staff", { kind: "group" }))).toBe(
		"staff",
	);
});

test("two-person groups and channels are never reused as private DMs", (): void => {
	expect(isDirectThread(thread("named", { kind: "group" }), "one", "two")).toBe(
		false,
	);
	expect(
		isDirectThread(thread("session:event", { eventId: "event" }), "one", "two"),
	).toBe(false);
	expect(
		isDirectThread(thread("dm-one-two", { kind: "direct" }), "one", "two"),
	).toBe(true);
});

test("inbox chronology uses original message dates and leaves empty imported rooms last", async (): Promise<void> => {
	const { compareConversations } = await import("../src/domain/messaging");
	const base = { unread: 0, readThrough: 0, updatedAt: 9999999999999 };
	const latest = {
		id: "message",
		threadId: "thread",
		accountId: "one",
		author: "One",
		body: "Hello",
		time: "2026-09-01T12:00:00Z",
	};
	const older = { ...thread("older"), ...base, latest };
	const newer = {
		...thread("newer"),
		...base,
		updatedAt: 1,
		latest: { ...latest, time: "2026-09-02T12:00:00Z" },
	};
	const empty = { ...thread("empty"), ...base };
	expect(
		[empty, older, newer].sort(compareConversations).map((entry) => entry.id),
	).toEqual(["newer", "older", "empty"]);
});
