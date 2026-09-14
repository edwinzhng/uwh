import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { createOccurrences, validateEvent } from "../src/domain/app-rules";
import type { ClubEvent, EventDraft } from "../src/domain/app-types";
import { personalCalendarEvents } from "../src/domain/calendar-export";
import { editedOccurrences, eventDraft } from "../src/domain/event-recurrence";
import {
	clubTimestamp,
	eventDates,
	signupState,
} from "../src/domain/event-time";

const draft: EventDraft = {
	title: "Fall Invitational",
	date: "2026-10-16",
	endDate: "2026-10-18",
	responseDeadline: "2026-09-25",
	start: "18:00",
	end: "15:00",
	venue: "Vancouver Aquatic Centre",
	kind: "tournament",
	repeat: "once",
	program: "club",
	description: "Entry fee and travel details",
};
const event = (): ClubEvent => {
	const created = createOccurrences("tournament", draft).at(0);
	if (!created) throw new Error("Tournament missing");
	return created;
};
beforeEach((): void => {
	setSystemTime(new Date("2026-09-01T12:00:00Z"));
});
afterEach((): void => {
	setSystemTime();
});

test("multi-day tournament retains date range and closes availability at deadline", (): void => {
	expect(validateEvent(draft)).toBeUndefined();
	const created = event();
	expect(eventDates(created)).toEqual([
		"2026-10-16",
		"2026-10-17",
		"2026-10-18",
	]);
	expect(signupState(created, clubTimestamp("2026-09-25", "12:00"))).toBe(
		"open",
	);
	expect(signupState(created, clubTimestamp("2026-09-26", "00:00"))).toBe(
		"closed",
	);
	expect(eventDraft(created).endDate).toBe(draft.endDate);
});

test("invalid tournament dates, repeated events and capacity-based availability are rejected", (): void => {
	for (const invalid of [
		{ endDate: "2026-10-15" },
		{ endDate: "2026-11-01" },
		{ responseDeadline: "2026-10-19" },
		{ capacity: 16 },
		{ repeat: "weekly" as const },
		{ kind: "training" as const },
	])
		expect(validateEvent({ ...draft, ...invalid })).toBeDefined();
	expect(validateEvent({ ...draft, endDate: draft.date })).toBeDefined();
});

test("editing the response deadline changes actual signup closure", (): void => {
	const original = event();
	const changed = editedOccurrences(
		[original],
		original,
		{ ...eventDraft(original), responseDeadline: "2026-09-30" },
		"single",
		Date.now(),
	).at(0);
	expect(changed?.closesAt).toBe(clubTimestamp("2026-09-30", "23:59"));
});

test("availability never assigns a roster place; only administrators edit assignments", (): void => {
	const created = event();
	const data = { ...initialAppData, events: [created], responses: [] };
	const responded = reduceApp(data, primaryAccount, {
		type: "respond",
		eventId: created.id,
		personId: "alex",
		response: "going",
	});
	expect(responded.events.at(0)?.tournamentRoster).toBeUndefined();
	const assignment = {
		type: "edit-event",
		eventId: created.id,
		scope: "single",
		draft: {
			...eventDraft(created),
			tournamentRoster: [{ personId: "alex", team: "Crocs A" }],
		},
	} as const;
	expect(() =>
		reduceApp(
			responded,
			{ ...primaryAccount, admin: false },
			{
				...assignment,
				draft: {
					...assignment.draft,
					tournamentRoster: [...assignment.draft.tournamentRoster],
				},
			},
		),
	).toThrow();
	const roster = reduceApp(responded, primaryAccount, {
		...assignment,
		draft: {
			...assignment.draft,
			tournamentRoster: [...assignment.draft.tournamentRoster],
		},
	});
	expect(roster.events.at(0)?.tournamentRoster).toEqual([
		{ personId: "alex", team: "Crocs A" },
	]);
	expect(roster.responses.at(0)?.response).toBe("going");
});

test("foreign and duplicate roster players are rejected", (): void => {
	expect(
		validateEvent({
			...draft,
			tournamentRoster: [
				{ personId: "alex", team: "A" },
				{ personId: "alex", team: "B" },
			],
		}),
	).toBeDefined();
	expect(() =>
		reduceApp(initialAppData, primaryAccount, {
			type: "create-event",
			id: "foreign",
			draft: {
				...draft,
				tournamentRoster: [{ personId: "foreign", team: "A" }],
			},
		}),
	).toThrow("Choose roster players from this club.");
});

test("calendar entry spans tournament and remains tentative until roster assignment", (): void => {
	const created = event();
	const response = {
		eventId: created.id,
		personId: "alex",
		response: "going",
		attendance: "unmarked",
	} as const;
	const calendar = personalCalendarEvents(
		[created],
		[response],
		"alex",
		["club"],
		false,
	).at(0);
	expect(calendar?.end).toBe(clubTimestamp("2026-10-18", "15:00"));
	expect(calendar?.status).toBe("TENTATIVE");
	const assigned = personalCalendarEvents(
		[{ ...created, tournamentRoster: [{ personId: "alex", team: "A" }] }],
		[response],
		"alex",
		["club"],
		false,
	).at(0);
	expect(assigned?.status).toBe("CONFIRMED");
	expect(assigned?.description).toContain("Team: A");
});

test("tournament host timezone is retained at creation and edit", (): void => {
	const created = reduceApp(initialAppData, primaryAccount, {
		type: "create-event",
		id: "host-zone",
		draft: { ...draft, timeZone: "America/Vancouver" },
	});
	const host = created.events.find((entry) => entry.id === "host-zone-0");
	if (!host) throw new Error("Tournament missing");
	expect(host.timeZone).toBe("America/Vancouver");
	expect(host.closesAt).toBe(
		clubTimestamp(
			draft.responseDeadline ?? draft.date,
			"23:59",
			"America/Vancouver",
		),
	);
	const changed = reduceApp(created, primaryAccount, {
		type: "edit-event",
		eventId: host.id,
		scope: "single",
		draft: { ...eventDraft(host), timeZone: "America/Toronto" },
	});
	expect(changed.events.find((entry) => entry.id === host.id)?.timeZone).toBe(
		"America/Toronto",
	);
	expect(changed.events.find((entry) => entry.id === host.id)?.closesAt).toBe(
		clubTimestamp(
			draft.responseDeadline ?? draft.date,
			"23:59",
			"America/Toronto",
		),
	);
});
