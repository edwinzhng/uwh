import { expect, test } from "bun:test";
import { createOccurrences, validateEvent } from "../src/domain/app-rules";
import type { ClubEvent, EventDraft } from "../src/domain/app-types";
import { completedCoachingEvent } from "../src/domain/coaching-hours";
import { eventDates } from "../src/domain/event-time";
import {
	eventKindLabel,
	eventKindsForFilter,
	eventTypeFilters,
	matchesEventType,
} from "../src/domain/event-types";
import { importRecord } from "../src/domain/import-data";

const meeting: EventDraft = {
	title: "Annual general meeting",
	kind: "meeting",
	date: "2027-01-12",
	start: "18:00",
	end: "19:00",
	venue: "Club room or video link",
	program: "club",
	repeat: "once",
	description: "Annual report and elections",
};
const make = (kind: ClubEvent["kind"]): ClubEvent => {
	const result = createOccurrences(kind, { ...meeting, kind }).at(0);
	if (!result) throw new Error("Missing event");
	return result;
};
test("filters keep legacy hockey with Practices and distinguish meetings, social and tournaments", (): void => {
	const events = [
		make("training"),
		make("hockey"),
		make("tournament"),
		make("social"),
		make("meeting"),
	];
	expect(
		events
			.filter((event) => matchesEventType(event, "practice"))
			.map((event) => event.kind),
	).toEqual(["training", "hockey"]);
	expect(
		events
			.filter((event) => matchesEventType(event, "meeting"))
			.map((event) => event.title),
	).toEqual([meeting.title]);
	expect(events.filter((event) => matchesEventType(event, "all"))).toHaveLength(
		5,
	);
	expect(eventTypeFilters.map((filter) => filter.label)).toEqual([
		"All",
		"Practices",
		"Tournaments",
		"Social",
		"Meetings",
	]);
	expect(eventKindsForFilter("tournament")).toEqual(["tournament"]);
	expect(eventKindLabel("hockey")).toBe("Practice");
});
test("meetings validate and recur without practice sections or coaching hours", (): void => {
	expect(validateEvent(meeting)).toBeUndefined();
	const repeated = createOccurrences("board", {
		...meeting,
		repeat: "monthly",
		occurrences: 3,
	});
	expect(repeated.map((event) => event.kind)).toEqual([
		"meeting",
		"meeting",
		"meeting",
	]);
	expect(repeated.map((event) => event.date)).toEqual([
		"2027-01-12",
		"2027-02-12",
		"2027-03-12",
	]);
	expect(
		completedCoachingEvent(make("meeting"), Date.parse("2028-01-01")),
	).toBe(false);
	expect(
		validateEvent({
			...meeting,
			parts: [
				{
					id: "practice",
					title: "Practice",
					kind: "training",
					start: "18:00",
					end: "19:00",
				},
			],
		}),
	).toBeDefined();
});
test("filtered calendar days preserve multi-day tournaments and omit unrelated events", (): void => {
	const tournament = { ...make("tournament"), endDate: "2027-01-14" };
	expect(
		[make("meeting"), tournament, make("training")]
			.filter((event) => matchesEventType(event, "tournament"))
			.flatMap(eventDates),
	).toEqual(["2027-01-12", "2027-01-13", "2027-01-14"]);
	expect(
		[make("meeting"), tournament].filter((event) =>
			matchesEventType(event, "social"),
		),
	).toHaveLength(0);
});
test("meeting import retains distinct type", (): void => {
	const record = importRecord(
		"events",
		{
			source_id: "agm",
			title: meeting.title,
			date: meeting.date,
			start: meeting.start,
			end: meeting.end,
			venue: meeting.venue,
			type: "meeting",
		},
		"2026-2027",
	);
	expect(record.kind).toBe("events");
	if (record.kind === "events") expect(record.draft.kind).toBe("meeting");
});
