import { expect, test } from "bun:test";
import {
	type SeasonHistoryEntry,
	seasonHistoryEvents,
} from "../src/domain/season-history";

const entry: SeasonHistoryEntry = {
	id: "change-1",
	personId: "sam",
	seasonId: "season-1",
	kind: "registration",
	amount: 0,
	note: "Registration: approved · CUGA: Yes",
	date: "2026-10-26",
	actor: "Fictional administrator",
};
const snapshot = (registration: string, cuga: boolean): string =>
	JSON.stringify({ personId: "sam", seasonId: "season-1", registration, cuga });

test("registration timeline shows only changed fields, not a repeated full state", () => {
	expect(
		seasonHistoryEvents([
			{
				...entry,
				before: snapshot("submitted", true),
				after: snapshot("approved", true),
			},
		]),
	).toEqual([
		{
			id: entry.id,
			title: "Registration approved",
			note: undefined,
			amount: undefined,
			date: entry.date,
			actor: entry.actor,
		},
	]);
	expect(
		seasonHistoryEvents([
			{
				...entry,
				before: snapshot("approved", false),
				after: snapshot("approved", true),
			},
		]).at(0)?.title,
	).toBe("CUGA membership confirmed");
});

test("one transaction can identify both registration and CUGA changes", () => {
	expect(
		seasonHistoryEvents([
			{
				...entry,
				before: snapshot("approved", true),
				after: snapshot("missing", false),
			},
		]).at(0)?.title,
	).toBe("Registration marked missing · CUGA membership removed");
	expect(
		seasonHistoryEvents([
			{
				...entry,
				before: snapshot("missing", false),
				after: snapshot("submitted", false),
			},
		]).at(0)?.title,
	).toBe("Registration submitted");
});

test("unchanged registration snapshots do not fabricate an event", () => {
	const record = snapshot("approved", true);
	expect(
		seasonHistoryEvents([{ ...entry, before: record, after: record }]),
	).toEqual([]);
});

test("missing, malformed or unrelated snapshots never invent prior registration state", () => {
	const invalid = [
		undefined,
		"{",
		"null",
		"[]",
		JSON.stringify({ registration: "approved", cuga: true }),
		JSON.stringify({
			personId: "other",
			seasonId: "season-1",
			registration: "approved",
			cuga: true,
		}),
		JSON.stringify({
			personId: "sam",
			seasonId: "other",
			registration: "approved",
			cuga: true,
		}),
		snapshot("unknown", true),
	];
	for (const before of invalid)
		expect(
			seasonHistoryEvents([
				{ ...entry, before, after: snapshot("approved", true) },
			]).at(0)?.title,
		).toBe("Registration updated");
});

test("monetary events preserve their actual amount, context, author, dates and source order", () => {
	const events = seasonHistoryEvents([
		{ ...entry, kind: "refund", amount: 500, note: " Returned payment " },
		{
			...entry,
			id: "change-2",
			kind: "payment",
			amount: 16000,
			note: "E-transfer",
		},
		{
			...entry,
			id: "change-3",
			kind: "dues",
			amount: 18000,
			note: "Season fee",
		},
	]);
	expect(events.map(({ title, amount }) => ({ title, amount }))).toEqual([
		{ title: "Refund recorded", amount: -500 },
		{ title: "Payment recorded", amount: 16000 },
		{ title: "Season dues set", amount: 18000 },
	]);
	expect(events.at(0)).toMatchObject({
		id: entry.id,
		note: "Returned payment",
		actor: entry.actor,
		date: entry.date,
	});
	expect(events.map(({ id }) => id)).toEqual([
		"change-1",
		"change-2",
		"change-3",
	]);
});
