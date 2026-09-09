import { expect, test } from "bun:test";
import { createOccurrences } from "../src/domain/app-rules";
import type { EventDraft } from "../src/domain/app-types";
import {
	editedOccurrences,
	eventDraft,
	seriesTargets,
} from "../src/domain/event-recurrence";
import {
	exportCsv,
	importTemplate,
	parseImportCsv,
} from "../src/domain/import-csv";
import { importKinds, importRecord } from "../src/domain/import-data";
import { notificationPath } from "../src/domain/push-routing";
import {
	applyLedgerChange,
	type SeasonRecord,
} from "../src/domain/season-ledger";

const draft: EventDraft = {
	title: "Practice",
	date: "2026-10-05",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	capacity: 24,
	repeat: "weekly",
	occurrences: 4,
	description: "Private coaching notes",
	seasonId: "2026-2027",
};
const now = Date.parse("2026-09-08T12:00:00Z");
const original = createOccurrences("test", draft);
const first = original.at(0);
const second = original.at(1);
if (!first || !second) throw new Error("Missing test events.");
test("series splitting retains prior events and IDs while appending a new cadence", (): void => {
	const changed = editedOccurrences(
		original,
		second,
		{
			...eventDraft(second),
			repeat: "fortnightly",
			occurrences: 5,
			rebuild: true,
		},
		"following",
		now,
		"split",
	);
	expect(changed.at(0)).toEqual(first);
	expect(changed.find((event) => event.id === second.id)?.date).toBe(
		second.date,
	);
	expect(
		changed
			.filter((event) => event.seriesId !== first.seriesId)
			.map((event) => event.date),
	).toEqual([
		"2026-10-12",
		"2026-10-26",
		"2026-11-09",
		"2026-11-23",
		"2026-12-07",
	]);
	expect(new Set(changed.map((event) => event.id)).size).toBe(6);
});
test("shortening cancels excess occurrences and never reuses their IDs on extension", (): void => {
	const shortened = editedOccurrences(
		original,
		first,
		{ ...draft, rebuild: true, occurrences: 2 },
		"series",
		now,
		"short",
	);
	expect(
		shortened.filter((event) => event.cancelled).map((event) => event.id),
	).toEqual(["test-2", "test-3"]);
	const anchor = shortened.at(0);
	if (!anchor) throw new Error("Missing anchor");
	const longer = editedOccurrences(
		shortened,
		anchor,
		{ ...draft, rebuild: true, occurrences: 4 },
		"series",
		now,
		"long",
	);
	expect(longer.filter((event) => event.cancelled)).toHaveLength(2);
	expect(longer.filter((event) => !event.cancelled)).toHaveLength(4);
	expect(new Set(longer.map((event) => event.id)).size).toBe(6);
});
test("individual exceptions retain order and survive a whole-series edit", (): void => {
	const exception = editedOccurrences(
		original,
		second,
		{ ...eventDraft(second), date: "2026-11-15", title: "Special practice" },
		"single",
		now,
		"exception",
	);
	expect(seriesTargets(exception, first, "series").at(1)?.id).toBe(second.id);
	const changed = editedOccurrences(
		exception,
		first,
		{ ...draft, rebuild: true, title: "Updated" },
		"series",
		now,
		"whole",
	);
	expect(changed.find((event) => event.id === second.id)).toMatchObject({
		title: "Special practice",
		date: "2026-11-15",
		exception: true,
	});
	expect(changed.find((event) => event.id === "test-2")?.date).toBe(
		"2026-10-19",
	);
});
test("series rebuild refuses moving or deleting history", (): void => {
	const past = Date.parse("2026-11-01T12:00:00Z");
	expect(() =>
		editedOccurrences(
			original,
			first,
			{ ...draft, date: "2026-10-06", rebuild: true },
			"series",
			past,
			"move",
		),
	).toThrow("Past events");
	expect(() =>
		editedOccurrences(
			original,
			first,
			{ ...draft, occurrences: 1, rebuild: true },
			"series",
			past,
			"remove",
		),
	).toThrow("Past events");
});
test("season ledger records payments and refunds without mixing records or accepting overpayments", (): void => {
	const initial: SeasonRecord = {
		personId: "sam",
		seasonId: "next",
		registration: "missing",
		cuga: false,
		due: 16000,
		paid: 0,
		revision: 0,
	};
	const paid = applyLedgerChange(initial, {
		kind: "payment",
		amount: 10000,
		note: "E-transfer",
		date: "2027-09-01",
	});
	expect(initial.paid).toBe(0);
	expect(paid.paid).toBe(10000);
	expect(paid.seasonId).toBe("next");
	expect(
		applyLedgerChange(paid, {
			kind: "refund",
			amount: 3000,
			note: "Correction",
			date: "2027-09-02",
		}).paid,
	).toBe(7000);
	expect(() =>
		applyLedgerChange(paid, {
			kind: "payment",
			amount: 6001,
			note: "Overpayment",
			date: "2027-09-01",
		}),
	).toThrow();
	expect(() =>
		applyLedgerChange(paid, {
			kind: "refund",
			amount: 10001,
			note: "Refund",
			date: "2027-09-01",
		}),
	).toThrow();
	expect(() =>
		applyLedgerChange(paid, {
			kind: "dues",
			amount: Number.NaN,
			note: "Dues",
			date: "2027-09-01",
		}),
	).toThrow();
});
test("CSV templates validate and quoted commas/newlines remain intact", (): void => {
	for (const { value } of importKinds) {
		const rows = parseImportCsv(importTemplate(value)).rows;
		const row = rows.at(0);
		if (!row) throw new Error("Empty template");
		expect(importRecord(value, row, "2026-2027").kind).toBe(value);
	}
	expect(
		parseImportCsv('source_id,name\n1,"Smith, Taylor\nJr."').rows.at(0)?.name,
	).toBe("Smith, Taylor\nJr.");
	expect(() => parseImportCsv("name,name\nA,B")).toThrow();
	expect(() => parseImportCsv('id,name\n1,"bad')).toThrow();
	expect(exportCsv([{ name: '=HYPERLINK("bad")' }])).toContain("'=HYPERLINK");
});
test("imports reject invalid dates, ambiguous values and missing source IDs", (): void => {
	expect(() => importRecord("members", { name: "Person" }, "season")).toThrow();
	expect(() =>
		importRecord(
			"registration",
			{
				source_id: "one",
				member_id: "p",
				status: "approved",
				cuga: "maybe",
				dues: "160",
			},
			"season",
		),
	).toThrow();
	expect(() =>
		importRecord(
			"payments",
			{
				source_id: "one",
				member_id: "p",
				date: "2026-02-30",
				amount: "16.004",
				note: "Transfer",
			},
			"season",
		),
	).toThrow();
	const event = parseImportCsv(importTemplate("events")).rows.at(0);
	if (!event) throw new Error("Missing event");
	const record = importRecord("events", event, "season");
	expect(record.kind === "events" && record.draft.public).toBe(false);
	expect(notificationPath("/session?event=series~revision-1")).toBe(
		"/session?event=series~revision-1",
	);
});
