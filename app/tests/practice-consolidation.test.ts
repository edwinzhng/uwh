import { expect, test } from "bun:test";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import {
	cleanPracticeEvent,
	cleanPracticeTitle,
	combinePractice,
	combinePracticeResponse,
	practicePairs,
	unreliableHistoricalPractice,
} from "../src/domain/practice-consolidation";

const training: ClubEvent = {
	id: "sporteasy:one",
	title: "Thursday EVENING Training",
	date: "2026-11-05",
	start: "19:45",
	end: "20:30",
	program: "thursday-practice",
	kind: "training",
	venue: "Pool",
	description: "Training source",
	cancelled: false,
	signup: "open",
};
const hockey: ClubEvent = {
	...training,
	id: "sporteasy:two",
	title: "Thursday EVENING Hockey",
	kind: "hockey",
	start: "20:30",
	end: "21:30",
	description: "Hockey source",
};
const response: EventResponse = {
	eventId: training.id,
	personId: "player",
	response: "going",
	attendance: "late",
};
test("consolidates adjacent sessions without losing original times or source descriptions", () => {
	const pairs = practicePairs([hockey, training]);
	expect(pairs).toHaveLength(1);
	const event = combinePractice({ training, hockey });
	expect(event.title).toBe("Thursday Practice");
	expect(event.start).toBe("19:45");
	expect(event.end).toBe("21:30");
	expect(event.parts?.map((part) => [part.id, part.start, part.end])).toEqual([
		["training", "19:45", "20:30"],
		["hockey", "20:30", "21:30"],
	]);
	expect(event.description).toContain("Hockey source");
	expect(practicePairs([event])).toEqual([]);
});
test("preserves per-part attendance and partial RSVPs", () => {
	const event = combinePractice({ training, hockey });
	const merged = combinePracticeResponse(event, "player", response, {
		...response,
		eventId: hockey.id,
		response: "unavailable",
		attendance: "absent",
	});
	expect(merged.partIds).toEqual(["training"]);
	expect(merged.declinedPartIds).toEqual(["hockey"]);
	expect(merged.partAttendance).toEqual([
		{ partId: "training", attendance: "late" },
		{ partId: "hockey", attendance: "absent" },
	]);
	expect(merged.attendance).toBe("late");
	expect(
		combinePracticeResponse(event, "player", undefined, {
			...response,
			eventId: hockey.id,
		}).partIds,
	).toEqual(["hockey"]);
});
test("does not invent missing sessions or merge ambiguous, overlapping, or differently cancelled practices", () => {
	expect(practicePairs([training])).toEqual([]);
	expect(
		practicePairs([training, hockey, { ...hockey, id: "sporteasy:third" }]),
	).toEqual([]);
	expect(() =>
		practicePairs([training, { ...hockey, start: "20:15" }]),
	).toThrow("needs review");
	expect(() =>
		practicePairs([training, { ...hockey, cancelled: true }]),
	).toThrow("needs review");
});
test("cleans regular practice titles without renaming AGM or other event types", () => {
	expect(cleanPracticeTitle({ ...training, title: "2026-2027 AGM" })).toBe(
		"2026-2027 AGM",
	);
	expect(cleanPracticeTitle({ ...training, date: "2026-11-09" })).toBe(
		"Monday Practice",
	);
	expect(cleanPracticeTitle({ ...training, date: "2026-11-08" })).toBe(
		"Sunday Practice",
	);
	expect(cleanPracticeTitle({ ...training, date: "2026-11-06" })).toBe(
		"Friday Practice",
	);
	expect(
		cleanPracticeTitle({ ...training, kind: "social", title: "Party" }),
	).toBe("Party");
});
test("links weekday practices to canonical programs and leaves AGM and tournaments standalone", () => {
	expect(cleanPracticeEvent({ ...training, program: "club" }).program).toBe(
		"thursday-practice",
	);
	expect(
		cleanPracticeEvent({
			...training,
			date: "2026-11-08",
			program: "old-sunday",
		}).program,
	).toBe("sunday-practice");
	expect(
		cleanPracticeEvent({ ...training, title: "2026-2027 AGM" }),
	).toMatchObject({ program: "all", kind: "meeting", title: "2026-2027 AGM" });
	expect(
		cleanPracticeEvent({ ...training, kind: "tournament", title: "Tournament" })
			.program,
	).toBe("all");
});
test("only removes historical practices with invalid times, preserving valid overnight events", () => {
	expect(
		unreliableHistoricalPractice({
			...training,
			date: "2026-10-29",
			end: training.start,
		}),
	).toBe(true);
	expect(
		unreliableHistoricalPractice({ ...training, date: "2026-10-29", end: "" }),
	).toBe(true);
	expect(
		unreliableHistoricalPractice({
			...training,
			date: "2026-10-29",
			start: "23:00",
			end: "01:00",
			endDate: "2026-10-30",
		}),
	).toBe(false);
	expect(
		unreliableHistoricalPractice({ ...training, end: training.start }),
	).toBe(false);
});
