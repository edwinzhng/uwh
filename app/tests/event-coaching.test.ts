import { describe, expect, test } from "bun:test";
import type { ClubEvent } from "../src/domain/app-types";
import type {
	CoachingAssignment,
	CoachOption,
} from "../src/domain/coaching-hours";
import { emptyCoachingSchedule } from "../src/domain/coaching-schedule";
import {
	automaticCoachingPractices,
	effectivePracticeCoaches,
} from "../src/domain/event-coaching";

const event: ClubEvent = {
	id: "practice",
	title: "Practice",
	date: "2026-09-07",
	start: "19:00",
	end: "20:30",
	venue: "Pool",
	program: "club",
	kind: "training",
	signup: "closed",
	capacity: 30,
	description: "",
	cancelled: false,
	seasonId: "2026-2027",
};
const coaches: CoachOption[] = [
	{
		coachId: "alex",
		personId: "alex-person",
		name: "Alex",
		programIds: ["club"],
	},
	{
		coachId: "casey",
		personId: "casey-person",
		name: "Casey",
		programIds: ["youth"],
	},
];
const schedule = {
	...emptyCoachingSchedule(),
	programs: [{ programId: "club", coachIds: ["alex", "casey"] }],
	backupCoachIds: ["casey"],
};
const now = Date.parse("2026-10-01T00:00:00Z");
const report = (
	events: ClubEvent[],
	overrides: Record<string, CoachingAssignment[]> = {},
): ReturnType<typeof automaticCoachingPractices> =>
	automaticCoachingPractices(
		events,
		schedule,
		coaches,
		overrides,
		"2026-2027",
		now,
	);

describe("automatic practice coaching", () => {
	test("credits scoped program defaults without recording or opening a dialog", () => {
		expect(report([event]).at(0)?.coaches).toEqual([
			{
				coachId: "alex",
				personId: "alex-person",
				name: "Alex",
				durationMinutes: 90,
			},
		]);
		expect(report([event]).at(0)?.durationEditable).toBe(true);
	});
	test("explicit empty override removes all defaults", () => {
		expect(report([event], { practice: [] })).toEqual([]);
	});
	test("preserves recorded overrides even after a coach leaves the current roster", () => {
		const recorded = [
			{
				coachId: "former",
				personId: "former-person",
				name: "Former coach",
				durationMinutes: 120,
			},
		];
		expect(report([event], { practice: recorded }).at(0)?.coaches).toEqual(
			recorded,
		);
	});
	test("does not count cancelled, future, social, meeting or other-season events", () => {
		expect(
			report([
				{ ...event, cancelled: true },
				{ ...event, date: "2027-01-01" },
				{ ...event, kind: "social" },
				{ ...event, kind: "meeting" },
				{ ...event, seasonId: "2025-2026" },
			]),
		).toEqual([]);
	});
	test("credits actual part time and preserves explicit part removals", () => {
		const multipart = {
			...event,
			end: "21:00",
			parts: [
				{
					id: "training",
					title: "Training",
					kind: "training" as const,
					start: "19:00",
					end: "19:30",
				},
				{
					id: "hockey",
					title: "Hockey",
					kind: "hockey" as const,
					start: "19:30",
					end: "21:00",
				},
			],
		};
		expect(report([multipart]).at(0)?.coaches.at(0)?.durationMinutes).toBe(120);
		expect(report([multipart]).at(0)?.durationEditable).toBe(false);
		const override = [
			{
				coachId: "alex",
				personId: "alex-person",
				name: "Alex",
				durationMinutes: 999,
				partIds: ["hockey"],
			},
		];
		expect(
			effectivePracticeCoaches(
				multipart,
				schedule,
				coaches,
				override,
				"training",
			),
		).toEqual([]);
		expect(
			effectivePracticeCoaches(
				multipart,
				schedule,
				coaches,
				override,
				"hockey",
			).at(0)?.durationMinutes,
		).toBe(90);
	});
	test("resolved history remains stable under later defaults and inactive coaches", () => {
		const old = effectivePracticeCoaches(event, schedule, coaches, undefined);
		const changed = {
			...schedule,
			programs: [{ programId: "club", coachIds: [] }],
		};
		expect(effectivePracticeCoaches(event, changed, [], old)).toEqual(old);
		expect(effectivePracticeCoaches(event, changed, [], [])).toEqual([]);
	});
});
