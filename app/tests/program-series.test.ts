import { expect, test } from "bun:test";
import { createStore } from "jotai";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import {
	previewAccountIdAtom,
	previewActionAtom,
	previewDataAtom,
} from "../src/demo/app-state";
import { previewSessionSeries } from "../src/demo/session-series-state";
import type { ClubEvent, EventResponse, Member } from "../src/domain/app-types";
import { addDays } from "../src/domain/calendar-dates";
import { eligibleResponses } from "../src/domain/event-recurrence";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import { defaultProgramRsvp } from "../src/domain/program-rsvp";
import {
	reconcileSeriesEligibility,
	type SessionSeries,
	seriesHasSpace,
	syncSeriesResponses,
} from "../src/domain/session-series";

const today = "2026-10-25";
const now = clubTimestamp(today, "20:00");
const member: Member = {
	id: "player",
	name: "Player",
	programs: ["sunday"],
	position: "Forward",
	rating: 50,
	registration: "approved",
	goal: "",
	steps: 0,
};
const event = (id: string, date: string): ClubEvent => ({
	id,
	date,
	title: "Sunday",
	start: "19:00",
	end: "21:00",
	program: "sunday",
	programRsvp: defaultProgramRsvp(),
	venue: "Pool",
	kind: "hockey",
	description: "",
	cancelled: false,
	signup: "open",
	seriesId: "sunday",
});
const events = [
	event("started", today),
	event("future", "2026-11-01"),
	event("later", "2026-11-08"),
];
const series: SessionSeries = {
	id: "sunday",
	seriesIds: ["sunday"],
	title: "Sunday",
	capacity: 1,
	enrollments: [
		{ personId: member.id, start: "2026-09-01", state: "committed" },
	],
};
const previous: EventResponse[] = events.map((entry) => ({
	eventId: entry.id,
	personId: member.id,
	response: "going",
	attendance: entry.id === "started" ? "present" : "unmarked",
	seriesExpected: true,
}));

test("program roster removal ends future commitments, clears reservation metadata and never reactivates merely by rejoining the program", (): void => {
	const removed = { ...member, programs: ["another-program"] };
	const next = reconcileSeriesEligibility(
		series,
		events,
		[removed],
		today,
		now,
	);
	expect(next.enrollments).toEqual([
		{
			personId: member.id,
			start: "2026-09-01",
			state: "committed",
			end: today,
		},
	]);
	expect(seriesHasSpace(next, "2026-11-01")).toBe(true);
	const responses = eligibleResponses(
		{ ...initialAppData, members: [removed], responses: previous },
		events,
		["future", "later"],
	);
	expect(responses.find((entry) => entry.eventId === "future")).toMatchObject({
		response: "unavailable",
		seriesExpected: undefined,
	});
	const synced = syncSeriesResponses(
		next,
		events,
		responses,
		today,
		now,
		[],
		[removed],
	);
	expect(synced.find((entry) => entry.eventId === "started")).toEqual(
		previous.at(0),
	);
	expect(
		synced.find((entry) => entry.eventId === "future")?.seriesExpected,
	).toBeUndefined();
	const restored = reconcileSeriesEligibility(
		next,
		events,
		[member],
		today,
		now,
	);
	expect(restored.enrollments).toEqual(next.enrollments);
	expect(
		syncSeriesResponses(restored, events, synced, today, now, [], [member])
			.filter((entry) => entry.eventId !== "started")
			.every((entry) => !entry.seriesExpected),
	).toBe(true);
});

test("future-only and merged alias commitments end safely while missing or ineligible members cannot be auto-invited", (): void => {
	const future = {
		...series,
		enrollments: [
			{ personId: member.id, start: "2026-11-01", state: "committed" as const },
		],
	};
	const merged = { ...member, archived: false, mergedInto: "canonical" };
	const next = reconcileSeriesEligibility(future, events, [merged], today, now);
	expect(next.enrollments.at(0)?.end).toBe("2026-11-01");
	expect(seriesHasSpace(next, "2026-11-01")).toBe(true);
	expect(syncSeriesResponses(series, events, [], today, now, [], [])).toEqual(
		[],
	);
	expect(
		syncSeriesResponses(
			series,
			events,
			[],
			today,
			now,
			[],
			[{ ...member, programs: [] }],
		),
	).toEqual([]);
});

test("single-session eligibility overrides suppress only that session without ending a valid program commitment", (): void => {
	const restricted = events.map((entry) =>
		entry.id === "future" ? { ...entry, eligiblePersonIds: ["other"] } : entry,
	);
	expect(
		reconcileSeriesEligibility(series, restricted, [member], today, now)
			.enrollments,
	).toEqual(series.enrollments);
	const next = syncSeriesResponses(
		series,
		restricted,
		previous,
		today,
		now,
		[],
		[member],
	);
	expect(
		next.find((entry) => entry.eventId === "future")?.seriesExpected,
	).toBeUndefined();
	expect(next.find((entry) => entry.eventId === "later")?.seriesExpected).toBe(
		true,
	);
	expect(next.find((entry) => entry.eventId === "started")).toEqual(
		previous.at(0),
	);
});

test("the real Jotai program controller ends reservations atomically and rejoining does not restore the old commitment", (): void => {
	const store = createStore();
	const date = clubDate(undefined, initialAppData.timeZone);
	const future = event("preview-future", addDays(date, 7));
	const program = {
		id: "sunday",
		name: "Sunday",
		revision: 0,
		archived: false,
		status: "active",
		kind: "hockey",
		rsvp: defaultProgramRsvp(),
	} as const;
	const draft = {
		id: program.id,
		name: program.name,
		archived: program.archived,
		status: program.status,
		kind: program.kind,
		rsvp: program.rsvp,
	};
	store.set(previewAccountIdAtom, primaryAccount.id);
	store.set(previewDataAtom, {
		...initialAppData,
		members: [member],
		programs: [program],
		events: [future],
		responses: [
			{
				eventId: future.id,
				personId: member.id,
				response: "going",
				attendance: "unmarked",
				seriesExpected: true,
			},
		],
		teams: [],
	});
	store.set(previewSessionSeries, [series]);
	store.set(previewActionAtom, {
		type: "save-program",
		draft,
		expectedRevision: 0,
		memberIds: [],
		requestId: "preview-remove-player",
	});
	expect(store.get(previewSessionSeries).at(0)?.enrollments.at(0)?.end).toBe(
		date,
	);
	expect(store.get(previewDataAtom).responses.at(0)).toMatchObject({
		response: "unavailable",
		seriesExpected: undefined,
	});
	expect(
		seriesHasSpace(
			store.get(previewSessionSeries).at(0) ?? series,
			future.date,
		),
	).toBe(true);
	store.set(previewActionAtom, {
		type: "save-program",
		draft,
		expectedRevision: 1,
		memberIds: [member.id],
		requestId: "preview-rejoin-player",
	});
	expect(store.get(previewSessionSeries).at(0)?.enrollments.at(0)?.end).toBe(
		date,
	);
	expect(
		store.get(previewDataAtom).responses.at(0)?.seriesExpected,
	).toBeUndefined();
});
