import { expect, test } from "bun:test";
import {
	defaultClubTimeZone,
	timeZoneOptions,
	validTimeZone,
} from "../src/domain/time-zones";

test("club timezone accepts named IANA zones and UTC but rejects offsets and unknown names", (): void => {
	for (const value of [
		"America/Edmonton",
		"America/Toronto",
		"Asia/Kolkata",
		"Pacific/Auckland",
		"UTC",
	])
		expect(validTimeZone(value)).toBe(true);
	for (const value of [
		"+02:00",
		"-0700",
		"GMT+5",
		"Toronto",
		"America/Unknown",
		"",
		" America/Toronto",
	])
		expect(validTimeZone(value)).toBe(false);
});

test("timezone choices include the club default, UTC and Canadian zones without duplicate values", (): void => {
	expect(defaultClubTimeZone).toBe("America/Edmonton");
	expect(
		timeZoneOptions.find((option) => option.value === defaultClubTimeZone)
			?.label,
	).toContain("Calgary");
	expect(
		timeZoneOptions.some((option) => option.value === "America/St_Johns"),
	).toBe(true);
	expect(timeZoneOptions.some((option) => option.value === "UTC")).toBe(true);
	expect(new Set(timeZoneOptions.map((option) => option.value)).size).toBe(
		timeZoneOptions.length,
	);
});

test("timezone aliases keep the same scheduling policy", async (): Promise<void> => {
	const { clubTimestamp, clubDate } = await import("../src/domain/event-time");
	const timestamp = clubTimestamp("2026-11-02", "19:45", "America/Edmonton");
	expect(clubTimestamp("2026-11-02", "19:45", "Canada/Mountain")).toBe(
		timestamp,
	);
	expect(clubTimestamp("2026-11-02", "19:45", "america/edmonton")).toBe(
		timestamp,
	);
	expect(clubDate(timestamp, "Canada/Mountain")).toBe(
		clubDate(timestamp, "America/Edmonton"),
	);
});
