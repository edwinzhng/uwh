import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent } from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import {
	applyProgramWindow,
	defaultProgramRsvp,
	programOpeningSchedule,
	validateProgramRsvp,
} from "../src/domain/program-rsvp";
import {
	type ProgramDraft,
	programDraft,
	validateProgram,
} from "../src/domain/programs";

const event: ClubEvent = {
	id: "practice",
	title: "Practice",
	program: "club",
	kind: "hockey",
	date: "2026-11-12",
	start: "19:00",
	end: "20:30",
	venue: "Pool",
	description: "",
	cancelled: false,
	signup: "open",
	timeZone: "America/Edmonton",
};

test("full-season opening makes every future date available immediately", (): void => {
	const now = clubTimestamp("2026-11-01", "12:00");
	const rsvp = { ...defaultProgramRsvp(), openRule: "season" as const };
	for (const date of ["2026-11-12", "2027-03-18"]) {
		const next = applyProgramWindow({ ...event, date }, { rsvp }, now);
		expect(next.opensAt).toBe(now);
		expect(next.signup).toBe("open");
		expect(next.closesAt).toBe(clubTimestamp(date, "18:00"));
	}
});

test("weekday and weeks-before use the session's calendar week in its time zone", (): void => {
	const rsvp = {
		...defaultProgramRsvp(),
		openRule: "weekly" as const,
		openWeekday: 7,
		openWeeks: 1,
		openTime: "09:30",
		notifyOnOpen: false,
	};
	const next = applyProgramWindow(event, { rsvp }, 0);
	expect(next.opensAt).toBe(clubTimestamp("2026-11-08", "09:30"));
	expect(next.programRsvp?.notifyOnOpen).toBe(false);
	expect(
		applyProgramWindow(
			{ ...event, date: "2026-11-19" },
			{ rsvp: { ...rsvp, openWeeks: 2 } },
			0,
		).opensAt,
	).toBe(next.opensAt);
	expect(validateProgramRsvp({ ...rsvp, openWeeks: 1.5 })).toBeDefined();
});

test("saved program drafts retain opening options and reject opening after closing", (): void => {
	const draft: ProgramDraft = {
		id: "weekly",
		name: "Weekly",
		kind: "hockey",
		status: "active",
		archived: false,
		schedule: {
			startDate: "2026-11-12",
			endDate: "2026-11-12",
			weekday: 4,
			start: "19:00",
			end: "20:30",
			venue: "Pool",
		},
		rsvp: {
			...defaultProgramRsvp(),
			openRule: "weekly",
			openWeekday: 5,
			openWeeks: 0,
			notifyOnOpen: false,
		},
	};
	expect(validateProgram(draft, initialAppData)).toBe(
		"RSVP must open before it closes.",
	);
	const valid = { ...draft, rsvp: { ...draft.rsvp, openWeeks: 1 } };
	expect(validateProgram(valid, initialAppData)).toBeUndefined();
	expect(programDraft({ ...valid, revision: 3 })).toEqual(valid);
});

test("editing legacy opening rules preserves their actual opening dates", (): void => {
	for (const weekday of [1, 4, 7]) {
		for (const openDays of [8, 14, 21]) {
			const legacy = {
				...defaultProgramRsvp(),
				openRule: "weekly" as const,
				openWeekday: weekday,
				openDays,
			};
			const fields = programOpeningSchedule(legacy, 4);
			expect(
				applyProgramWindow(
					event,
					{
						rsvp: {
							...legacy,
							openWeekday: fields.weekday,
							openWeeks: fields.weeks,
						},
					},
					0,
				).opensAt,
			).toBe(applyProgramWindow(event, { rsvp: legacy }, 0).opensAt);
		}
	}
});
