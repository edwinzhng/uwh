import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent, Member } from "../src/domain/app-types";
import {
	coachHomePlayers,
	coachHomePracticeEnds,
	coachingPracticeEnd,
} from "../src/domain/coach-home";
import { clubTimestamp } from "../src/domain/event-time";

const member = (id: string): Member => ({
	id,
	name: id,
	programs: ["club"],
	position: "",
	rating: 0,
	registration: "approved",
	goal: "",
	steps: 0,
});
const event: ClubEvent = {
	id: "a",
	title: "Practice",
	date: "2026-09-01",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	kind: "training",
	program: "club",
	signup: "closed",
	cancelled: false,
	description: "",
	seasonId: "2026-2027",
};

test("coach home counts current players, known divisions and completed club practices", (): void => {
	const season = initialAppData.seasons.find(
		(entry) => entry.id === "2026-2027",
	);
	if (!season) throw new Error("Season unavailable");
	const people = [
		member("youth"),
		member("elite"),
		member("unknown"),
		{ ...member("archived"), archived: true },
		{ ...member("guardian"), programs: [] },
	];
	const details = [
		{ personId: "youth", birthDate: "2009-12-31", gender: "female" as const },
		{ personId: "elite", birthDate: "1998-01-01", gender: "male" as const },
	];
	const events: ClubEvent[] = [
		event,
		{ ...event, id: "future", date: "2026-11-01" },
		{ ...event, id: "cancelled", cancelled: true },
		{ ...event, id: "social", kind: "social" },
		{ ...event, id: "other-season", seasonId: "other" },
	];
	const stats = coachHomePlayers(people, details, season);
	const practiceEnds = coachHomePracticeEnds(events, season);
	expect(stats.players).toBe(3);
	expect(stats.youth).toBe(1);
	expect(stats.women).toBe(1);
	expect(stats.unknownDivisions).toBe(1);
	expect(
		stats.divisions.find((entry) => entry.label === "U19 Women's")?.count,
	).toBe(1);
	expect(
		stats.divisions.find((entry) => entry.label === "Elite Men's")?.count,
	).toBe(1);
	expect(
		practiceEnds.filter((end) => end <= Date.parse("2026-10-01T12:00:00Z")),
	).toHaveLength(1);
	expect(practiceEnds).toHaveLength(2);
});

test("a coaching assignment ends with its last assigned practice part", (): void => {
	const split: ClubEvent = {
		...event,
		parts: [
			{
				id: "training",
				kind: "training",
				title: "Training",
				start: "19:00",
				end: "19:30",
			},
			{
				id: "hockey",
				kind: "hockey",
				title: "Hockey",
				start: "19:30",
				end: "20:00",
			},
		],
	};
	const assignment = {
		coachId: "coach",
		personId: "player",
		name: "Coach",
		durationMinutes: 30,
		partIds: ["training"],
	};
	expect(coachingPracticeEnd(split, [assignment], "coach")).toBe(
		clubTimestamp(event.date, "19:30"),
	);
	expect(coachingPracticeEnd(split, [assignment], "another")).toBeUndefined();
});
