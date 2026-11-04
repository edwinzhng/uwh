import { expect, test } from "bun:test";
import { eventDateParts } from "../src/domain/event-card-presentation";

test("event date blocks retain the calendar day without device timezone drift", (): void => {
	expect(eventDateParts("2026-10-29")).toEqual({
		weekday: "Thu",
		day: "29",
		month: "Oct",
	});
	expect(eventDateParts("2027-01-01")).toEqual({
		weekday: "Fri",
		day: "1",
		month: "Jan",
	});
	expect(eventDateParts("2028-02-29")).toEqual({
		weekday: "Tue",
		day: "29",
		month: "Feb",
	});
});
