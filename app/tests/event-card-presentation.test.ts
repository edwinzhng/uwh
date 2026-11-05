import { expect, test } from "bun:test";
import {
	eventDateParts,
	eventTimeRange,
} from "../src/domain/event-card-presentation";

test("time ranges share meridiems and omit zero minutes consistently across runtimes", () => {
	expect(eventTimeRange("19:45", "20:30")).toBe("7:45–8:30pm");
	expect(eventTimeRange("20:30", "21:30")).toBe("8:30–9:30pm");
	expect(eventTimeRange("09:00", "10:00")).toBe("9–10am");
	expect(eventTimeRange("11:30", "12:30")).toBe("11:30am–12:30pm");
	expect(eventTimeRange("23:00", "00:00")).toBe("11pm–12am");
});

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
