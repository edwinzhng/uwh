import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent } from "../src/domain/app-types";
import { chatProgramId, nextChatPractice } from "../src/domain/chat-practice";
import { clubTimestamp } from "../src/domain/event-time";
import { messageClockLabel } from "../src/domain/message-presentation";

const baseline = initialAppData.events.at(0);
if (!baseline) throw new Error("Missing fixture event");
const practice: ClubEvent = {
	...baseline,
	id: "next",
	date: "2099-01-01",
	endDate: undefined,
	start: "18:00",
	end: "20:00",
	program: "youth",
	kind: "training",
	cancelled: false,
	timeZone: "America/Edmonton",
};
const now = clubTimestamp(practice.date, "19:00", practice.timeZone);
test("only canonical program rooms can show the program practice", (): void => {
	expect(chatProgramId("youth")).toBe("youth");
	expect(chatProgramId("room:program:club")).toBe("club");
	for (const id of [
		"club",
		"staff",
		"room:program:youth",
		"room:program:",
		"dm:someone",
		"event:youth",
		"Monday Program",
	])
		expect(nextChatPractice([practice], id, now)).toBeUndefined();
});
test("practice selection includes in-progress, excludes cancelled, ended and other programs, and sorts by time", (): void => {
	const later = { ...practice, id: "later", date: "2099-01-02" };
	expect(
		nextChatPractice(
			[
				later,
				{ ...practice, program: "other", id: "other" },
				{ ...practice, cancelled: true, id: "cancelled" },
				{ ...practice, kind: "meeting", id: "meeting" },
				practice,
			],
			"youth",
			now,
		)?.id,
	).toBe("next");
	expect(
		nextChatPractice(
			[practice, later],
			"youth",
			clubTimestamp(practice.date, practice.end, practice.timeZone),
		)?.id,
	).toBe("later");
	expect(
		nextChatPractice(
			[practice],
			"youth",
			clubTimestamp("2099-01-02", "00:00", practice.timeZone),
		),
	).toBeUndefined();
});
test("bubble timestamps keep actual clocks and omit historical relative labels", (): void => {
	expect(messageClockLabel({ time: "Yesterday" })).toBeUndefined();
	expect(messageClockLabel({ time: "2:16 PM" })).toBe("2:16 PM");
	expect(messageClockLabel({ time: "2026-11-02T21:16:00Z" }, "UTC")).toBe(
		"9:16 PM",
	);
});
