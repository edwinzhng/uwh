import { expect, test } from "bun:test";
import { displayDate, displayDateTime } from "../src/domain/date-display";

test("calendar dates use one month-day-year format without weekday or timezone drift", (): void => {
	expect(displayDate("2026-10-24")).toBe("Oct 24, 2026");
	expect(displayDate("2026-01-01", "America/Edmonton")).toBe("Jan 1, 2026");
	expect(displayDate("2024-02-29", "Pacific/Auckland")).toBe("Feb 29, 2024");
});

test("timestamps respect an explicit club timezone and invalid dates do not leak raw text", (): void => {
	const midnight = Date.parse("2026-10-25T01:00:00Z");
	expect(displayDate(midnight, "America/Edmonton")).toBe("Oct 24, 2026");
	expect(displayDateTime(midnight, "America/Edmonton")).toBe(
		"Oct 24, 2026 · 7:00 PM",
	);
	expect(displayDate("not a date")).toBe("—");
});
