import { expect, test } from "bun:test";
import {
	type MondayEvent,
	type MondayResponse,
	migrationMondayPairs,
	migrationMondayResponse,
	migrationMondaySnapshot,
} from "../convex/migration_monday";

const event = (id: string, patch: Partial<MondayEvent> = {}): MondayEvent => ({
	id,
	title: "Practice",
	date: "2026-11-02",
	start: "20:30",
	end: "22:00",
	venue: "Pool",
	program: "monday",
	kind: "training",
	signup: "open",
	description: "",
	cancelled: false,
	...patch,
});
const response = (
	eventId: string,
	patch: Partial<MondayResponse> = {},
): MondayResponse => ({
	id: `${eventId}:player`,
	eventId,
	personId: "player",
	response: "going",
	attendance: "unmarked",
	...patch,
});

test("Monday reconciliation accepts only unique same-program Monday practices within ten minutes", (): void => {
	const base = event("base44:Event:one", { start: "20:25" });
	const sport = event("sporteasy:one");
	expect(migrationMondayPairs([base, sport])).toEqual([
		{ sourceId: base.id, targetId: sport.id, date: base.date },
	]);
	for (const patch of [
		{ start: "20:41" },
		{ program: "other" },
		{ kind: "meeting" as const },
		{ date: "2026-11-03" },
	])
		expect(migrationMondayPairs([base, event(sport.id, patch)])).toEqual([]);
	expect(
		migrationMondayPairs([
			base,
			sport,
			event("sporteasy:two", { start: "21:00" }),
		]),
	).toEqual([]);
	expect(
		migrationMondayPairs([base, sport, event("base44:Event:two")]),
	).toEqual([]);
	expect(migrationMondayPairs([event("base44:Session:one"), sport])).toEqual(
		[],
	);
});

test("Base44 intent and SportEasy actual attendance merge independently under the canonical event key", (): void => {
	const base = response("base44:Event:one", { response: "unavailable" });
	const sport = response("sporteasy:one", { attendance: "present" });
	const result = migrationMondayResponse(
		base,
		sport,
		base,
		sport,
		sport.eventId,
	);
	expect(result.id).toBe(sport.id);
	expect(result.eventId).toBe(sport.eventId);
	expect(result.response).toBe("unavailable");
	expect(result.attendance).toBe("present");
});

test("Monday response reconciliation retains phone edits field by field and rejects conflicting edits", (): void => {
	const base = response("base44:Event:one");
	const sport = response("sporteasy:one", { attendance: "present" });
	const result = migrationMondayResponse(
		{ ...base, attendance: "late" },
		{ ...sport, response: "unavailable", absenceReason: "Away" },
		base,
		sport,
		sport.eventId,
	);
	expect(result.attendance).toBe("late");
	expect(result.response).toBe("unavailable");
	expect(result.absenceReason).toBe("Away");
	expect(() =>
		migrationMondayResponse(
			{ ...base, response: "waiting" },
			{ ...sport, response: "unavailable" },
			base,
			sport,
			sport.eventId,
		),
	).toThrow("Conflicting manual");
	expect(
		migrationMondayResponse(base, undefined, base, undefined, sport.eventId),
	).toEqual({ ...base, id: sport.id, eventId: sport.eventId });
});

test("migration snapshot comparison ignores object ordering and absent optional values but retains array order", (): void => {
	expect(migrationMondaySnapshot({ b: 2, a: 1, c: undefined })).toBe(
		migrationMondaySnapshot({ a: 1, b: 2 }),
	);
	expect(migrationMondaySnapshot(["a", "b"])).not.toBe(
		migrationMondaySnapshot(["b", "a"]),
	);
});
