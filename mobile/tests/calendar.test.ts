import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import {
	calendarDays,
	calendarKeyDate,
	moveCalendarMonth,
} from "../src/design-system/calendar-values";
import { reduceApp } from "../src/domain/app-reducer";
import { eventResponse } from "../src/domain/app-rules";

test("month grid includes every date once, Monday through Sunday", (): void => {
	const days = calendarDays("2026-09-10");
	expect(days.at(0)).toBe("2026-08-31");
	expect(days.at(-1)).toBe("2026-10-04");
	expect(new Set(days).size).toBe(days.length);
	expect(days.filter((day) => day.startsWith("2026-09"))).toHaveLength(30);
	expect(calendarDays("2026-08-10")).toHaveLength(42);
	expect(calendarDays("2027-02-15")).toHaveLength(28);
});

test("month navigation clamps month ends and crosses years", (): void => {
	expect(moveCalendarMonth("2026-01-31", 1)).toBe("2026-02-28");
	expect(moveCalendarMonth("2028-01-31", 1)).toBe("2028-02-29");
	expect(moveCalendarMonth("2026-01-10", -1)).toBe("2025-12-10");
	expect(moveCalendarMonth("2026-12-10", 1)).toBe("2027-01-10");
});

test("calendar keys move dates and leave other keys to native activation", (): void => {
	expect(calendarKeyDate("2026-09-01", "ArrowLeft")).toBe("2026-08-31");
	expect(calendarKeyDate("2026-09-30", "ArrowRight")).toBe("2026-10-01");
	expect(calendarKeyDate("2026-09-10", "ArrowUp")).toBe("2026-09-03");
	expect(calendarKeyDate("2026-09-10", "ArrowDown")).toBe("2026-09-17");
	expect(calendarKeyDate("2026-09-10", "Home")).toBe("2026-09-07");
	expect(calendarKeyDate("2026-09-10", "End")).toBe("2026-09-13");
	expect(calendarKeyDate("2026-01-31", "PageDown")).toBe("2026-02-28");
	expect(calendarKeyDate("2026-01-31", "PageUp")).toBe("2025-12-31");
	expect(calendarKeyDate("2026-01-31", "Enter")).toBeUndefined();
});

test("quick attendance changes and undo preserve signups and other players", (): void => {
	const late = reduceApp(initialAppData, primaryAccount, {
		type: "attendance",
		eventId: "club-thu",
		personId: "sam",
		attendance: "late",
	});
	const noShow = reduceApp(late, primaryAccount, {
		type: "attendance",
		eventId: "club-thu",
		personId: "sam",
		attendance: "absent",
	});
	const cleared = reduceApp(noShow, primaryAccount, {
		type: "attendance",
		eventId: "club-thu",
		personId: "sam",
		attendance: "unmarked",
	});
	expect(eventResponse(late, "club-thu", "sam")).toMatchObject({
		attendance: "late",
		response: "going",
	});
	expect(eventResponse(noShow, "club-thu", "sam")).toMatchObject({
		attendance: "absent",
		response: "going",
	});
	expect(eventResponse(cleared, "club-thu", "sam")).toMatchObject({
		attendance: "unmarked",
		response: "going",
	});
	expect(eventResponse(cleared, "youth-thu", "sam")).toEqual(
		eventResponse(initialAppData, "youth-thu", "sam"),
	);
	expect(eventResponse(cleared, "club-thu", "alex")).toEqual(
		eventResponse(initialAppData, "club-thu", "alex"),
	);
});
