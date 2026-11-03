import { expect, test } from "bun:test";
import type { CoachingPractice } from "../src/domain/coaching-hours";
import { coachingReportTotals } from "../src/features/coaching-hours-summary";

const practices: CoachingPractice[] = [
	{
		eventId: "practice-a",
		title: "Club practice",
		date: "2026-09-01",
		start: "19:00",
		coaches: [
			{
				coachId: "active",
				personId: "active-player",
				name: "Alex",
				durationMinutes: 45,
			},
			{
				coachId: "former",
				personId: "former-player",
				name: "Alex",
				durationMinutes: 60,
			},
		],
	},
	{
		eventId: "practice-b",
		title: "Club practice",
		date: "2026-09-02",
		start: "19:00",
		coaches: [
			{
				coachId: "active",
				personId: "active-player",
				name: "Alex",
				durationMinutes: 90,
			},
		],
	},
];

test("hours coach selection includes zero-hour current coaches and preserves recorded former coaches", (): void => {
	const totals = coachingReportTotals(practices, [
		{ coachId: "active", personId: "active-player", name: "Alex" },
		{ coachId: "new", personId: "new-player", name: "Jamie" },
	]);
	expect(totals).toHaveLength(3);
	expect(totals.find((coach) => coach.coachId === "active")).toEqual({
		coachId: "active",
		name: "Alex",
		minutes: 135,
		practices: 2,
	});
	expect(totals.find((coach) => coach.coachId === "former")).toEqual({
		coachId: "former",
		name: "Alex",
		minutes: 60,
		practices: 1,
	});
	expect(totals.find((coach) => coach.coachId === "new")).toEqual({
		coachId: "new",
		name: "Jamie",
		minutes: 0,
		practices: 0,
	});
});

test("coach selection does not invent hours or practice counts without recorded practices", (): void => {
	expect(
		coachingReportTotals(
			[],
			[{ coachId: "new", personId: "new-player", name: "Jamie" }],
		),
	).toEqual([{ coachId: "new", name: "Jamie", minutes: 0, practices: 0 }]);
	expect(coachingReportTotals([], [])).toEqual([]);
});
