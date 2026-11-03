import { describe, expect, test } from "bun:test";
import {
	changedCoachingPrograms,
	coachingWeekday,
	emptyCoachingSchedule,
	programCoachesFor,
	validateCoachingSchedule,
	validateProgramCoaching,
	weeklyCoachesFor,
} from "../src/domain/coaching-schedule";

test("program defaults follow the program, never the weekday or backups", (): void => {
	const schedule = {
		...emptyCoachingSchedule(),
		programs: [{ programId: "club", coachIds: ["alex"] }],
		backupCoachIds: ["casey"],
	};
	expect(programCoachesFor(schedule, "club")).toEqual(["alex"]);
	expect(programCoachesFor(schedule, "youth")).toEqual([]);
	expect(
		programCoachesFor({ ...schedule, programs: undefined }, "club"),
	).toEqual([]);
});

test("program assignments reject duplicate programs and coaches and overlarge lists", (): void => {
	const schedule = emptyCoachingSchedule();
	expect(
		validateCoachingSchedule({
			...schedule,
			programs: [
				{ programId: "club", coachIds: [] },
				{ programId: "club", coachIds: [] },
			],
		}),
	).toContain("distinct programs");
	expect(
		validateCoachingSchedule({
			...schedule,
			programs: [{ programId: "club", coachIds: ["a", "a"] }],
		}),
	).toContain("different coaches");
});

test("coaches can only change their program defaults and cannot assign outsiders", (): void => {
	const previous = emptyCoachingSchedule();
	const next = {
		...previous,
		programs: [{ programId: "club", coachIds: ["alex"] }],
	};
	const programs = [
		{ id: "club", archived: false },
		{ id: "youth", archived: false },
	];
	const coaches = [
		{ coachId: "alex", name: "Alex", personId: "alex", programIds: ["club"] },
	];
	expect(
		validateProgramCoaching(
			previous,
			next,
			{ admin: false, coachPrograms: ["club"] },
			programs,
			coaches,
		),
	).toBeUndefined();
	expect(
		validateProgramCoaching(
			previous,
			next,
			{ admin: false, coachPrograms: ["youth"] },
			programs,
			coaches,
		),
	).toContain("your programs");
	expect(
		validateProgramCoaching(
			previous,
			next,
			{ admin: true, coachPrograms: [] },
			programs,
			[],
		),
	).toContain("access to this program");
	expect(
		validateProgramCoaching(
			previous,
			next,
			{ admin: true, coachPrograms: [] },
			[{ id: "club", archived: true }],
			coaches,
		),
	).toContain("active program");
});

test("unchanged and legacy defaults do not block scoped edits or imply new assignments", (): void => {
	const previous = {
		...emptyCoachingSchedule(),
		programs: [{ programId: "youth", coachIds: ["former"] }],
	};
	const next = {
		...previous,
		programs: [...previous.programs, { programId: "club", coachIds: ["alex"] }],
	};
	expect(changedCoachingPrograms(previous, next)).toEqual(["club"]);
	expect(
		changedCoachingPrograms(previous, { ...previous, programs: undefined }),
	).toEqual([]);
	expect(
		validateProgramCoaching(
			previous,
			next,
			{ admin: false, coachPrograms: ["club"] },
			[{ id: "club", archived: false }],
			[
				{
					coachId: "alex",
					name: "Alex",
					personId: "alex",
					programIds: ["club"],
				},
			],
		),
	).toBeUndefined();
});

describe("weekly coaching roster", () => {
	test("starts with a distinct empty roster for all seven weekdays", () => {
		const schedule = emptyCoachingSchedule();
		expect(schedule.days).toHaveLength(7);
		expect(validateCoachingSchedule(schedule)).toBeUndefined();
		expect(schedule.days.every((day) => day.coachIds.length === 0)).toBe(true);
	});
	test("uses the session's calendar date and never assigns backup coaches automatically", () => {
		const schedule = {
			...emptyCoachingSchedule(),
			days: emptyCoachingSchedule().days.map((day) => ({
				...day,
				coachIds: day.weekday === "monday" ? ["alex"] : [],
			})),
			backupCoachIds: ["casey"],
		};
		expect(coachingWeekday("2026-11-02")).toBe("monday");
		expect(coachingWeekday("2026-11-01")).toBe("sunday");
		expect(weeklyCoachesFor(schedule, "2026-11-02")).toEqual(["alex"]);
		expect(weeklyCoachesFor(schedule, "2026-11-03")).toEqual([]);
	});
	test("rejects missing or duplicated weekdays", () => {
		const schedule = emptyCoachingSchedule();
		expect(
			validateCoachingSchedule({ ...schedule, days: schedule.days.slice(1) }),
		).toContain("each day");
		const first = schedule.days.at(0);
		if (!first) throw new Error("Missing Monday.");
		expect(
			validateCoachingSchedule({
				...schedule,
				days: schedule.days.map(() => first),
			}),
		).toContain("each day");
	});
	test("rejects duplicate or unbounded coach selections", () => {
		const schedule = emptyCoachingSchedule();
		expect(
			validateCoachingSchedule({
				...schedule,
				days: schedule.days.map((day) => ({
					...day,
					coachIds: ["alex", "alex"],
				})),
			}),
		).toContain("different coaches");
		expect(
			validateCoachingSchedule({
				...schedule,
				days: schedule.days.map((day) => ({
					...day,
					coachIds: Array.from({ length: 9 }, (_, index) => `coach-${index}`),
				})),
			}),
		).toContain("8");
		expect(
			validateCoachingSchedule({
				...schedule,
				backupCoachIds: ["casey", "casey"],
			}),
		).toContain("different backup");
	});
});
