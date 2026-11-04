import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent } from "../src/domain/app-types";
import { clubTimestamp, futureSignupOpening } from "../src/domain/event-time";
import {
	applyProgramWindow,
	defaultProgramRsvp,
	validateProgramRsvp,
} from "../src/domain/program-rsvp";
import {
	type ClubProgram,
	programDraft,
	saveProgram,
} from "../src/domain/programs";

const rsvp = {
	...defaultProgramRsvp(),
	openRule: "weekly" as const,
	openWeekday: 7,
	openDays: 14,
	openTime: "12:00",
	closeTime: "20:30",
};
const program: ClubProgram = {
	id: "practice",
	name: "Practice",
	revision: 0,
	archived: false,
	status: "active",
	kind: "hockey",
	rsvp,
};
const event: ClubEvent = {
	id: "practice-1",
	title: "Practice",
	date: "2026-11-15",
	start: "20:30",
	end: "22:00",
	venue: "Pool",
	program: program.id,
	kind: "hockey",
	description: "",
	cancelled: false,
	signup: "scheduled",
	timeZone: "America/Edmonton",
};
const now = clubTimestamp("2026-11-04", "00:00", event.timeZone);

test("Sunday noon opens the following Sunday, Monday, Thursday and Friday within an exclusive fourteen-day calendar window", (): void => {
	for (const date of ["2026-11-15", "2026-11-16", "2026-11-19", "2026-11-20"]) {
		const next = applyProgramWindow({ ...event, date }, program, now);
		expect(next.opensAt).toBe(
			clubTimestamp("2026-11-08", "12:00", event.timeZone),
		);
		expect(futureSignupOpening(next, now)).toBe(next.opensAt);
		expect(next.signup).toBe("scheduled");
		expect(
			applyProgramWindow({ ...event, date }, program, next.opensAt ?? now)
				.signup,
		).toBe("open");
	}
	expect(
		applyProgramWindow(
			{ ...event, date: "2026-11-22", start: "09:00" },
			program,
			now,
		).opensAt,
	).toBe(clubTimestamp("2026-11-15", "12:00", event.timeZone));
});

test("weekly openings follow historical and current Calgary time rules", (): void => {
	expect(
		applyProgramWindow({ ...event, date: "2026-03-01" }, program, now).opensAt,
	).toBe(Date.parse("2026-02-22T19:00:00Z"));
	expect(
		applyProgramWindow({ ...event, date: "2027-03-14" }, program, now).opensAt,
	).toBe(Date.parse("2027-03-07T18:00:00Z"));
	expect(
		applyProgramWindow({ ...event, date: "2027-03-21" }, program, now).opensAt,
	).toBe(Date.parse("2027-03-14T18:00:00Z"));
});

test("opening weekday and look-ahead period are configurable and survive editing", (): void => {
	const custom = {
		...program,
		rsvp: { ...rsvp, openWeekday: 3, openDays: 21, openTime: "09:15" },
	};
	expect(programDraft(custom).rsvp).toEqual(custom.rsvp);
	expect(
		applyProgramWindow({ ...event, date: "2026-11-20" }, custom, now).opensAt,
	).toBe(clubTimestamp("2026-11-04", "09:15", event.timeZone));
	expect(validateProgramRsvp({ ...rsvp, openWeekday: 0 })).toBeDefined();
	expect(validateProgramRsvp({ ...rsvp, openDays: 7 })).toBeDefined();
	expect(validateProgramRsvp(rsvp)).toBeUndefined();
	expect(
		applyProgramWindow({ ...event, start: "08:45" }, program, now).closesAt,
	).toBe(clubTimestamp(event.date, "08:45", event.timeZone));
});

test("program registration edits preserve imported individual times and do not generate extra dates", (): void => {
	const imported = {
		...event,
		date: "2026-11-22",
		title: "Sunday practice",
		exception: true,
		programRsvpManaged: true,
	};
	const custom = {
		...event,
		id: "custom",
		date: "2026-11-29",
		programRsvpManaged: false,
		opensAt: 123,
	};
	const data = {
		...initialAppData,
		programs: [program],
		events: [imported, custom],
		responses: [],
		teams: [],
	};
	const next = saveProgram(data, programDraft(program), 0, [], now);
	expect(next.events).toHaveLength(2);
	expect(next.events.at(0)).toMatchObject({
		title: "Sunday practice",
		start: "20:30",
		end: "22:00",
		exception: true,
		opensAt: clubTimestamp("2026-11-15", "12:00", event.timeZone),
	});
	expect(next.events.at(1)).toEqual(custom);
});
