import { expect, test } from "bun:test";
import {
	dateFromValue,
	dateToValue,
	formatTime,
	isDateAllowed,
	parseDate,
	parseTime,
	relativeDate,
	timeFromDate,
	timeSuggestions,
	timeToDate,
} from "../src/design-system/date-time-values";

test("calendar dates stay on the chosen local day", () => {
	for (const value of [
		"2024-02-29",
		"2026-03-08",
		"2026-11-01",
		"2026-12-31",
		"0099-01-01",
	]) {
		const date = dateFromValue(value);
		expect(date).toBeDefined();
		if (!date) throw new Error("Expected a valid calendar date");
		expect(dateToValue(date)).toBe(value);
		expect(date.getHours()).toBe(12);
	}
});

test("invalid dates are rejected without rolling into another month", () => {
	for (const value of [
		"2026-02-29",
		"2026-02-31",
		"1900-02-29",
		"2026-04-31",
		"2026-13-01",
		"2026-00-10",
		"2026-01-00",
		"2026-1-7",
		"0000-01-01",
		"09/07/2026",
		"",
		"no date",
	])
		expect(dateFromValue(value)).toBeUndefined();
	expect(dateFromValue("2000-02-29")).toBeDefined();
});

test("date shortcuts cross month, year and daylight-saving boundaries", () => {
	for (const [from, to] of [
		["2026-02-28", "2026-03-01"],
		["2026-12-31", "2027-01-01"],
		["2026-03-08", "2026-03-09"],
		["2026-11-01", "2026-11-02"],
	]) {
		const date = dateFromValue(from);
		if (!date || !from || !to) throw new Error("Expected valid shortcut dates");
		expect(relativeDate(1, date)).toBe(to);
		expect(parseDate(" TOMORROW ", date)).toBe(to);
		expect(parseDate("today", date)).toBe(from);
	}
	expect(parseDate(" 2026-09-07 ")).toBe("2026-09-07");
	expect(parseDate("next Wednesday")).toBeUndefined();
});

test("date limits include both boundary days", () => {
	expect(isDateAllowed("2026-09-07", "2026-09-07", "2026-09-10")).toBe(true);
	expect(isDateAllowed("2026-09-10", "2026-09-07", "2026-09-10")).toBe(true);
	expect(isDateAllowed("2026-09-06", "2026-09-07")).toBe(false);
	expect(isDateAllowed("2026-09-11", undefined, "2026-09-10")).toBe(false);
	expect(isDateAllowed("2026-02-30")).toBe(false);
});

test("time entry accepts twelve-hour and twenty-four-hour notation", () => {
	for (const [input, expected] of [
		["6:30 pm", "18:30"],
		["18:30", "18:30"],
		[" 6p ", "18:00"],
		["6am", "06:00"],
		["12 AM", "00:00"],
		["12 PM", "12:00"],
		["0:00", "00:00"],
		["23:59", "23:59"],
		["6:07 pm", "18:07"],
	]) {
		if (!input || !expected) throw new Error("Expected a time example");
		expect(parseTime(input)).toBe(expected);
		expect(parseTime(formatTime(expected))).toBe(expected);
		expect(timeFromDate(timeToDate(expected))).toBe(expected);
	}
});

test("invalid time text is rejected", () => {
	for (const value of [
		"24:00",
		"18:60",
		"13 pm",
		"0 am",
		"-1:00",
		"6:7",
		"6:30 pmm",
		"noonish",
		"",
		"18:30:10",
	])
		expect(parseTime(value)).toBeUndefined();
});

test("time suggestions cover one day without duplicate midnight", () => {
	expect(timeSuggestions).toHaveLength(96);
	expect(new Set(timeSuggestions.map((item) => item.value)).size).toBe(96);
	expect(timeSuggestions.at(0)).toEqual({ value: "00:00", label: "12:00 AM" });
	expect(timeSuggestions.at(-1)).toEqual({ value: "23:45", label: "11:45 PM" });
	for (const item of timeSuggestions)
		expect(parseTime(item.label)).toBe(item.value);
});
