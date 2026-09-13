import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import type { ClubEvent } from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import {
	homeSchedule,
	householdMembers,
	relevantHouseholdEvent,
} from "../src/domain/home";

const event = (
	id: string,
	date: string,
	extra: Partial<ClubEvent> = {},
): ClubEvent => ({
	id,
	date,
	title: id,
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	signup: "open",
	description: "",
	cancelled: false,
	...extra,
});

test("Home shows remaining sessions through Sunday and excludes ended or cancelled sessions", (): void => {
	const now = clubTimestamp("2026-09-16", "12:00");
	const events = [
		event("past", "2026-09-14"),
		event("tonight", "2026-09-16"),
		event("sunday", "2026-09-20"),
		event("next", "2026-09-21"),
		event("cancelled", "2026-09-18", { cancelled: true }),
	];
	expect(homeSchedule(events, now).events.map((entry) => entry.id)).toEqual([
		"tonight",
		"sunday",
	]);
	expect(homeSchedule(events, now).thisWeek).toBe(true);
});

test("Home falls back to next session and keeps tournaments separate including ongoing multi-day events", (): void => {
	const now = clubTimestamp("2026-09-20", "21:00");
	const events = [
		event("ended", "2026-09-20"),
		event("next", "2026-09-21"),
		event("later", "2026-09-23"),
		event("tournament", "2026-09-19", {
			kind: "tournament",
			endDate: "2026-09-22",
		}),
	];
	const home = homeSchedule(events, now);
	expect(home.events.map((entry) => entry.id)).toEqual(["next"]);
	expect(home.thisWeek).toBe(false);
	expect(home.nextTournament?.id).toBe("tournament");
});

test("Home relevance uses the household and program and respects restricted eligibility", (): void => {
	const people = householdMembers(initialAppData, primaryAccount);
	expect(
		people.every(
			(person) =>
				person.id === primaryAccount.personId ||
				primaryAccount.children.includes(person.id),
		),
	).toBe(true);
	expect(
		relevantHouseholdEvent(
			event("private", "2026-09-21", { eligiblePersonIds: ["unrelated"] }),
			people,
		),
	).toBe(false);
	expect(
		relevantHouseholdEvent(
			event("other-program", "2026-09-21", { program: "unrelated" }),
			people,
		),
	).toBe(false);
});
