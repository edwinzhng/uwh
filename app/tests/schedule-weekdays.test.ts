import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import {
	eventWeekday,
	scheduledWeekdays,
} from "../src/domain/schedule-weekdays";

test("weekday tabs use scheduled dates across programs and omit past and cancelled events", (): void => {
	const event = initialAppData.events.at(0);
	if (!event) throw new Error("Missing event fixture");
	const events = [
		{ ...event, date: "2026-11-08", endDate: undefined, cancelled: false },
		{ ...event, date: "2026-11-09", endDate: undefined, cancelled: false },
		{ ...event, date: "2026-11-09", endDate: undefined, cancelled: false },
		{ ...event, date: "2026-11-10", endDate: undefined, cancelled: true },
		{ ...event, date: "2026-10-30", endDate: undefined, cancelled: false },
	];
	expect(scheduledWeekdays(events, Date.parse("2026-11-04T12:00:00Z"))).toEqual(
		[0, 1],
	);
	expect(eventWeekday({ date: "2026-11-05" })).toBe(4);
});
