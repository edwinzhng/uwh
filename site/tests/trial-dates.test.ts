import { describe, expect, test } from "bun:test";
import { trialDates } from "../lib/trial-dates";

describe("trial date booking cutoff", () => {
	test("Sunday is available on Friday but closes at Calgary midnight on Saturday", () => {
		expect(trialDates(new Date("2026-09-12T05:59:59Z"))).toContain(
			"2026-09-13",
		);
		expect(trialDates(new Date("2026-09-12T06:00:00Z"))).not.toContain(
			"2026-09-13",
		);
	});

	test("today is excluded and the next Sunday remains available", () => {
		const dates = trialDates(new Date("2026-09-13T19:00:00Z"));
		expect(dates).not.toContain("2026-09-13");
		expect(dates.at(0)).toBe("2026-09-20");
	});

	test("the cutoff follows Calgary time in winter too", () => {
		expect(trialDates(new Date("2026-01-10T06:59:59Z"))).toContain(
			"2026-01-11",
		);
		expect(trialDates(new Date("2026-01-10T07:00:00Z"))).not.toContain(
			"2026-01-11",
		);
	});
});
