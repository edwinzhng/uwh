import { describe, expect, test } from "bun:test";
import type { ClubEvent } from "../src/domain/app-types";
import {
	type CoachingPractice,
	coachingTotals,
	completedCoachingEvent,
	defaultCoachingDuration,
	validCoachingDuration,
} from "../src/domain/coaching-hours";
import { clubTimestamp } from "../src/domain/event-time";

const event: ClubEvent = {
	id: "practice",
	title: "Training",
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
const practice = (
	eventId: string,
	coaches: CoachingPractice["coaches"],
): CoachingPractice => ({
	eventId,
	title: "Training",
	date: "2026-09-07",
	start: "19:00",
	coaches,
});
const coach = (
	coachId: string,
	durationMinutes: number,
): CoachingPractice["coaches"][number] => ({
	coachId,
	durationMinutes,
	name: "Shared name",
	personId: coachId,
});
describe("coaching hours", () => {
	test("retains Friday and non-Friday duration defaults", () => {
		expect(defaultCoachingDuration("2026-09-11")).toBe(60);
		expect(defaultCoachingDuration("2026-09-07")).toBe(90);
		expect(defaultCoachingDuration("2026-09-13")).toBe(90);
		expect([60, 90, 120, 150, 180].every(validCoachingDuration)).toBe(true);
		expect(
			[0, 30, 61, 181, Number.NaN, Number.POSITIVE_INFINITY].some(
				validCoachingDuration,
			),
		).toBe(false);
	});
	test("includes only finished non-cancelled practices", () => {
		const end = clubTimestamp(event.date, event.end);
		expect(completedCoachingEvent(event, end - 1)).toBe(false);
		expect(completedCoachingEvent(event, end)).toBe(true);
		expect(completedCoachingEvent({ ...event, cancelled: true }, end + 1)).toBe(
			false,
		);
		expect(completedCoachingEvent({ ...event, kind: "social" }, end + 1)).toBe(
			false,
		);
		expect(completedCoachingEvent({ ...event, kind: "hockey" }, end + 1)).toBe(
			true,
		);
	});
	test("counts assignments by account and preserves per-coach durations", () => {
		const rows = [
			practice("first", [coach("alex", 60), coach("jamie", 90)]),
			practice("second", [coach("alex", 150)]),
			practice("third", []),
		];
		expect(coachingTotals(rows)).toEqual([
			{ coachId: "alex", name: "Shared name", minutes: 210, practices: 2 },
			{ coachId: "jamie", name: "Shared name", minutes: 90, practices: 1 },
		]);
		expect(coachingTotals([])).toEqual([]);
	});
});
