import { describe, expect, test } from "bun:test";
import type { ClubEvent } from "../src/domain/app-types";
import {
	type CoachingPractice,
	coachingPartMinutes,
	coachingTotals,
	completedCoachingEvent,
	defaultCoachingDuration,
	resolvedCoachingAssignment,
	updatedCoachingPartIds,
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
	test("practice parts count only assigned time and never double-count overlaps", () => {
		const combined: ClubEvent = {
			...event,
			parts: [
				{
					id: "training",
					title: "Training",
					kind: "training",
					start: "19:00",
					end: "20:00",
				},
				{
					id: "hockey",
					title: "Hockey",
					kind: "hockey",
					start: "19:45",
					end: "20:30",
				},
			],
		};
		expect(coachingPartMinutes(combined)).toBe(90);
		expect(coachingPartMinutes(combined, ["hockey"])).toBe(45);
		expect(coachingPartMinutes(combined, ["removed"])).toBe(0);
		expect(
			coachingPartMinutes({
				...combined,
				parts: combined.parts?.map((part) =>
					part.id === "hockey"
						? { ...part, start: "20:15", end: "20:45" }
						: part,
				),
			}),
		).toBe(90);
		const assignment = coach("alex", 150);
		expect(
			resolvedCoachingAssignment(combined, assignment).durationMinutes,
		).toBe(90);
		expect(resolvedCoachingAssignment(event, assignment).durationMinutes).toBe(
			150,
		);
		expect(updatedCoachingPartIds(combined, undefined, true, "hockey")).toEqual(
			["hockey"],
		);
		expect(
			updatedCoachingPartIds(combined, assignment, false, "training"),
		).toEqual(["hockey"]);
		expect(
			updatedCoachingPartIds(
				combined,
				{ ...assignment, partIds: ["hockey"] },
				true,
				"hockey",
			),
		).toEqual(["hockey"]);
		expect(updatedCoachingPartIds(combined, assignment, false)).toEqual([]);
	});
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
