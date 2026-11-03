import { expect, test } from "bun:test";
import type { Doc } from "../convex/_generated/dataModel";
import { buildMigrationSchedule } from "./migration-schedule";

type Input = Parameters<typeof buildMigrationSchedule>[0];
const event = (
	id: string,
	date = "2026-11-02",
	start = "20:30",
): Doc<"events">["value"] => ({
	id: `sporteasy:${id}`,
	title: id,
	date,
	start,
	end: "22:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	signup: "open",
	description: "",
	cancelled: false,
});
const input = (extra: Partial<Input> = {}): Input => ({
	tables: {
		Program: [
			{
				id: "monday",
				name: "Monday",
				time_start: "20:30",
				time_end: "22:00",
				type: "Training",
				location: "Pool",
			},
		],
	},
	calendar: [],
	legacyPractices: [],
	legacyAttendance: [],
	presence: [],
	columns: [],
	person: (_source, id): string => (id === "oliver-old" ? "oliver" : id),
	...extra,
});

test("Sports UIDs remain canonical, legacy merges only exact sport IDs, Monday Base44 matches only unique date and start", (): void => {
	const calendar = [{ uid: "sport", value: event("sport") }];
	const tables = {
		...input().tables,
		Event: [
			{
				id: "monday",
				date: "2026-11-02",
				time_start: "20:30",
				time_end: "22:00",
				program_id: "monday",
			},
			{
				id: "thursday",
				date: "2026-11-05",
				time_start: "20:30",
				time_end: "22:00",
				program_id: "monday",
			},
		],
	};
	const result = buildMigrationSchedule(
		input({
			calendar,
			tables,
			legacyPractices: [
				{ _id: "same-date", date: Date.parse("2026-11-03T03:30:00Z") },
				{
					_id: "exact",
					date: Date.parse("2026-11-03T03:30:00Z"),
					sporteasyId: "sport",
				},
			],
		}),
	);
	expect(result.events).toHaveLength(2);
	expect(result.sourceEvents.get("base44:Event:monday")?.id).toBe(
		"sporteasy:sport",
	);
	expect(result.sourceEvents.get("base44:Event:thursday")).toBeUndefined();
	expect(result.sourceEvents.get("legacy:exact")?.id).toBe("sporteasy:sport");
	expect(result.sourceEvents.get("legacy:same-date")?.id).toBe(
		"legacy:same-date",
	);
	expect(calendar.at(0)?.value.start).toBe("20:30");
});

test("legacy timestamp and unknown end are retained without shifting to a weekday mentioned in notes", (): void => {
	const result = buildMigrationSchedule(
		input({
			legacyPractices: [
				{
					_id: "source",
					date: Date.parse("2026-01-30T08:00:00Z"),
					notes: "Thursday training",
				},
			],
		}),
	);
	const value = result.events.at(0)?.value;
	expect(value?.date).toBe("2026-01-30");
	expect(value?.start).toBe("01:00");
	expect(value?.end).toBe("01:00");
	expect(value?.seasonId).toBe("2025-2026");
	expect(value?.description).toContain("End time not recorded");
});

test("Base44 sessions use a unique actual Monday practice or retain their own source date and program times", (): void => {
	const result = buildMigrationSchedule(
		input({
			calendar: [
				{ uid: "one", value: event("one") },
				{ uid: "two", value: event("two", "2026-11-09", "19:00") },
				{ uid: "three", value: event("three", "2026-11-09", "20:30") },
			],
			tables: {
				...input().tables,
				Session: [
					{
						id: "matched",
						date: "2026-11-02",
						program_id: "monday",
						session_number: "1",
					},
					{
						id: "separate",
						date: "2026-11-09",
						program_id: "monday",
						session_number: "2",
					},
				],
			},
		}),
	);
	expect(result.sourceEvents.get("base44:Session:matched")?.id).toBe(
		"sporteasy:one",
	);
	expect(result.sourceEvents.get("base44:Session:separate")).toMatchObject({
		id: "base44:Session:separate",
		date: "2026-11-09",
		start: "20:30",
		end: "22:00",
	});
	expect(() =>
		buildMigrationSchedule(
			input({ tables: { Session: [{ id: "undated", date: "" }] } }),
		),
	).toThrow();
});

test("Monday-only RSVP intent and Sports actual attendance merge independently while Excused is never a no-show", (): void => {
	const mondayEvent = event("sport");
	const result = buildMigrationSchedule(
		input({
			calendar: [{ uid: "sport", value: mondayEvent }],
			tables: {
				...input().tables,
				Event: [
					{
						id: "monday",
						date: mondayEvent.date,
						time_start: mondayEvent.start,
						time_end: mondayEvent.end,
						program_id: "monday",
					},
					{
						id: "other-day",
						date: "2026-11-05",
						time_start: "20:30",
						time_end: "22:00",
						program_id: "monday",
					},
				],
				AttendanceRSVP: [
					{ event_id: "monday", player_id: "no-but-present", response: "no" },
					{ event_id: "monday", player_id: "no-show", response: "yes" },
					{ event_id: "other-day", player_id: "ignored", response: "yes" },
				],
			},
			presence: [
				{ B: "11/02/26" },
				{ B: "Practice" },
				{ A: "no-but-present", B: "On time" },
				{ A: "no-show", B: "Not excused" },
				{ A: "excused", B: "Excused" },
				{ A: "late", B: "Late" },
			],
			columns: [{ index: 0, eventId: "sport" }],
		}),
	);
	const response = (personId: string): Doc<"responses">["value"] | undefined =>
		result.responses.find((row) => row.value.personId === personId)?.value;
	expect(response("no-but-present")).toMatchObject({
		response: "unavailable",
		attendance: "present",
	});
	expect(response("no-show")).toMatchObject({
		response: "going",
		attendance: "absent",
	});
	expect(response("excused")).toMatchObject({
		response: "unavailable",
		attendance: "unmarked",
	});
	expect(response("late")).toMatchObject({
		response: "going",
		attendance: "late",
	});
	expect(response("ignored")).toBeUndefined();
	expect(result.summary.base44MondayRsvp).toBe(2);
});

test("approved duplicate Oliver histories collapse per event; false and orphan attendance never fabricate absence or dates", (): void => {
	const result = buildMigrationSchedule(
		input({
			calendar: [{ uid: "sport", value: event("sport") }],
			legacyPractices: [
				{
					_id: "practice",
					date: Date.parse("2026-11-03T03:30:00Z"),
					sporteasyId: "sport",
				},
			],
			legacyAttendance: [
				{
					_id: "one",
					practiceId: "practice",
					playerId: "oliver",
					attended: true,
				},
				{
					_id: "two",
					practiceId: "practice",
					playerId: "oliver-old",
					attended: true,
				},
				{
					_id: "false",
					practiceId: "practice",
					playerId: "not-present",
					attended: false,
				},
				{
					_id: "orphan",
					practiceId: "missing",
					playerId: "orphan",
					attended: true,
				},
			],
			presence: [
				{ B: "11/02/26" },
				{ B: "Practice" },
				{ A: "oliver", B: "Not selected" },
			],
			columns: [{ index: 0, eventId: "sport" }],
		}),
	);
	expect(result.responses).toHaveLength(1);
	expect(result.responses.at(0)).toMatchObject({
		sourceId: "sporteasy:sport:oliver",
		value: { personId: "oliver", response: "going", attendance: "present" },
	});
	expect(result.summary.orphanLegacyAttendance).toBe(1);
	expect(result.sourceEvents.has("legacy:missing")).toBe(false);
});

test("presence uses verified explicit UID columns rather than same-date matching and rejects mismatched captures", (): void => {
	const context = input({
		calendar: [
			{ uid: "early", value: event("early", "2026-11-02", "19:00") },
			{ uid: "late", value: event("late") },
		],
		presence: [
			{ B: "11/02/26" },
			{ B: "Practice" },
			{ A: "person", B: "Late" },
		],
		columns: [
			{ index: 0, eventId: "late" },
			{ index: 24, eventId: "ignored-outside-export" },
		],
	});
	expect(buildMigrationSchedule(context).responses.at(0)?.value.eventId).toBe(
		"sporteasy:late",
	);
	expect(() =>
		buildMigrationSchedule({
			...context,
			presence: [{ B: "11/03/26" }, {}, { A: "person", B: "Late" }],
		}),
	).toThrow("date does not match");
	expect(() =>
		buildMigrationSchedule({
			...context,
			columns: [{ index: 0, eventId: "unknown" }],
		}),
	).toThrow("Missing SportEasy");
});
