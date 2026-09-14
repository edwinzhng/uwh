import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { createOccurrences, eventResponse } from "../src/domain/app-rules";
import type { AppData, ClubEvent, EventDraft } from "../src/domain/app-types";
import {
	editedOccurrences,
	eventDraft,
	occurrenceDates,
} from "../src/domain/event-recurrence";
import { clubTimestamp, signupState } from "../src/domain/event-time";

const draft: EventDraft = {
	seasonId: "2026-2027",
	title: "Monday group",
	date: "2026-10-05",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	capacity: 20,
	repeat: "weekly",
	occurrences: 3,
	description: "",
	signupOpens: "now",
	signupCloses: "hour",
};
const events = createOccurrences("series", draft);
const target = events.at(0);
if (!target) throw new Error("Missing event");
const data: AppData = {
	...initialAppData,
	events,
	responses: [
		{
			eventId: target.id,
			personId: "sam",
			response: "going",
			attendance: "late",
		},
	],
};

test("recurrence supports weekdays, daily, fortnightly and clamped monthly dates", (): void => {
	expect(
		occurrenceDates({
			...draft,
			repeat: "weekdays",
			date: "2026-10-09",
			occurrences: 4,
		}),
	).toEqual(["2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14"]);
	expect(occurrenceDates({ ...draft, repeat: "daily" })).toEqual([
		"2026-10-05",
		"2026-10-06",
		"2026-10-07",
	]);
	expect(occurrenceDates({ ...draft, repeat: "fortnightly" })).toEqual([
		"2026-10-05",
		"2026-10-19",
		"2026-11-02",
	]);
	expect(
		occurrenceDates({ ...draft, date: "2027-01-31", repeat: "monthly" }),
	).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
	expect(() => occurrenceDates({ ...draft, occurrences: 53 })).toThrow();
});

test("single and series edits preserve event IDs, attendance and registration policies", (): void => {
	const single = reduceApp(data, primaryAccount, {
		type: "edit-event",
		eventId: target.id,
		draft: {
			...eventDraft(target),
			title: "Updated",
			date: "2026-10-06",
			start: "20:00",
			end: "21:00",
		},
		scope: "single",
	});
	expect(single.events.at(0)?.date).toBe("2026-10-06");
	expect(single.events.at(1)).toEqual(events.at(1));
	expect(single.responses).toEqual(data.responses);
	expect(single.events.at(0)?.opensAt).toBe(target.opensAt);
	expect(single.events.at(0)?.closesAt).toBe(
		clubTimestamp("2026-10-06", "19:00"),
	);
	const series = reduceApp(data, primaryAccount, {
		type: "edit-event",
		eventId: target.id,
		draft: { ...draft, title: "New title", date: "2026-10-06" },
		scope: "series",
	});
	expect(series.events.map((event) => event.date)).toEqual([
		"2026-10-06",
		"2026-10-13",
		"2026-10-20",
	]);
	expect(series.events.map((event) => event.id)).toEqual(
		events.map((event) => event.id),
	);
	expect(series.responses).toEqual(data.responses);
	const legacy: ClubEvent = {
		...target,
		signupOpens: undefined,
		signupCloses: undefined,
		opensAt: clubTimestamp(target.date, target.start) - 72 * 3600000,
	};
	const unchanged = editedOccurrences(
		[legacy],
		legacy,
		{ ...eventDraft(legacy), title: "Just the title" },
		"single",
		Date.now(),
	).at(0);
	expect(unchanged?.opensAt).toBe(legacy.opensAt);
	expect(unchanged?.closesAt).toBe(legacy.closesAt);
});

test("player restrictions replace program membership and apply to guardians and attendance", (): void => {
	const restricted = reduceApp(initialAppData, primaryAccount, {
		type: "create-event",
		id: "restricted",
		draft: { ...draft, eligiblePersonIds: ["sam"] },
	});
	const joined = reduceApp(restricted, primaryAccount, {
		type: "respond",
		eventId: "restricted-0",
		personId: "sam",
		response: "going",
	});
	expect(eventResponse(joined, "restricted-0", "sam").response).toBe("going");
	expect(() =>
		reduceApp(joined, primaryAccount, {
			type: "respond",
			eventId: "restricted-0",
			personId: "mila",
			response: "going",
		}),
	).toThrow();
	expect(() =>
		reduceApp(joined, primaryAccount, {
			type: "attendance",
			eventId: "restricted-0",
			personId: "mila",
			attendance: "present",
		}),
	).toThrow();
	const unrestricted = reduceApp(data, primaryAccount, {
		type: "respond",
		eventId: target.id,
		personId: "mila",
		response: "going",
	});
	expect(eventResponse(unrestricted, target.id, "mila").response).toBe("going");
	const removed = reduceApp(data, primaryAccount, {
		type: "edit-event",
		eventId: target.id,
		draft: { ...draft, eligiblePersonIds: ["alex"] },
		scope: "single",
	});
	expect(eventResponse(removed, target.id, "sam")).toMatchObject({
		response: "unavailable",
		attendance: "late",
	});
	expect(() =>
		reduceApp(data, primaryAccount, {
			type: "create-event",
			id: "empty",
			draft: { ...draft, eligiblePersonIds: [] },
		}),
	).toThrow();
});

test("only admins edit events and seasons; season assignment is validated", (): void => {
	const coach = { ...primaryAccount, admin: false };
	expect(() =>
		reduceApp(data, coach, {
			type: "edit-event",
			eventId: target.id,
			draft,
			scope: "series",
		}),
	).toThrow();
	const season = {
		id: "next",
		name: "2027–2028",
		start: "2027-09-01",
		end: "2028-08-31",
	};
	expect(() =>
		reduceApp(data, coach, { type: "add-season", season }),
	).toThrow();
	const next = reduceApp(data, primaryAccount, { type: "add-season", season });
	const linked = reduceApp(next, primaryAccount, {
		type: "edit-event",
		eventId: target.id,
		draft: { ...draft, seasonId: season.id },
		scope: "series",
	});
	expect(linked.events.every((event) => event.seasonId === season.id)).toBe(
		true,
	);
	expect(() =>
		reduceApp(data, primaryAccount, {
			type: "create-event",
			id: "unknown",
			draft: { ...draft, seasonId: "missing" },
		}),
	).toThrow("Choose a season");
	expect(
		signupState(
			{ ...target, opensAt: undefined, closesAt: undefined, signup: "open" },
			clubTimestamp(target.date, target.start),
		),
	).toBe("closed");
});
