import { describe, expect, test } from "bun:test";
import { initialAppData, previewAccounts } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { canRegister } from "../src/domain/app-rules";
import type {
	AppData,
	ClubEvent,
	EventResponse,
	TeamPlan,
} from "../src/domain/app-types";
import { eventDraft } from "../src/domain/event-recurrence";
import { clubTimestamp } from "../src/domain/event-time";
import {
	defaultProgramResponses,
	defaultProgramRsvp,
	type ProgramDraft,
	programDates,
	programDraft,
	saveProgram,
	validateProgram,
} from "../src/domain/programs";

const now = Date.parse("2026-10-25T12:00:00Z");
const draft: ProgramDraft = {
	id: "weekend",
	name: "Sunday practice",
	archived: false,
	status: "active",
	kind: "hockey",
	seasonId: "2026-2027",
	schedule: {
		startDate: "2026-10-25",
		endDate: "2026-11-15",
		weekday: 7,
		start: "19:00",
		end: "20:30",
		venue: "South pool",
	},
	rsvp: { ...defaultProgramRsvp(), openDays: 7, defaultResponse: "going" },
};
const base = (): AppData => ({
	...initialAppData,
	programs: undefined,
	events: [],
	responses: [],
	teams: [],
});
const people = initialAppData.members
	.filter((member) => !member.archived)
	.slice(0, 3)
	.map((member) => member.id);

describe("programs", () => {
	test("editing a queried program strips persistence-only fields", () => {
		const saved = saveProgram(base(), draft, 0, people, now);
		const program = saved.programs?.find((entry) => entry.id === draft.id);
		if (!program) throw new Error("Fixture program missing");
		expect(programDraft(program)).toEqual(draft);
		expect(Object.hasOwn(programDraft(program), "revision")).toBe(false);
	});
	test("program edits preserve published history and unchanged future lineups", () => {
		const saved = saveProgram(base(), draft, 0, people, now);
		const plans = saved.events.map(
			(event): TeamPlan => ({
				eventId: event.id,
				black: people.slice(0, 1),
				white: people.slice(1),
				attendees: people,
				published: true,
				revision: 2,
			}),
		);
		const withPlans = { ...saved, teams: plans };
		const renamed = saveProgram(
			withPlans,
			{ ...draft, name: "New label" },
			1,
			people,
			Date.parse("2026-10-26T12:00:00Z"),
		);
		expect(renamed.teams).toEqual(plans);
		expect(renamed.events.at(0)?.title).toBe(draft.name);
		const changed = saveProgram(
			{
				...withPlans,
				responses: saved.events.map(
					(event) =>
						({
							eventId: event.id,
							personId: people.at(0) ?? "",
							response: "going",
							attendance: "present",
						}) satisfies EventResponse,
				),
			},
			draft,
			1,
			[],
			Date.parse("2026-10-26T12:00:00Z"),
		);
		expect(changed.teams.at(0)).toEqual(plans.at(0));
		expect(changed.teams.at(1)?.published).toBe(false);
		expect(changed.responses.at(0)?.response).toBe("going");
	});
	test("weekly dates, roster and safe future session updates", () => {
		expect(
			programDates(
				draft.schedule ?? {
					startDate: "",
					endDate: "",
					weekday: 0,
					start: "",
					end: "",
					venue: "",
				},
			),
		).toEqual(["2026-10-25", "2026-11-01", "2026-11-08", "2026-11-15"]);
		const saved = saveProgram(base(), draft, 0, people, now);
		expect(
			saved.programs?.find((program) => program.id === draft.id)?.revision,
		).toBe(1);
		expect(saved.events).toHaveLength(4);
		expect(
			saved.events.every(
				(event) => event.programManaged && event.program === draft.id,
			),
		).toBe(true);
		expect(
			saved.members
				.filter((member) => member.programs.includes(draft.id))
				.map((member) => member.id),
		).toEqual(people);
		const first = saved.events.at(0);
		expect(first?.opensAt).toBe(
			clubTimestamp("2026-10-18", "12:00", saved.timeZone),
		);
		const again = saveProgram(
			saved,
			{ ...draft, name: "Renamed" },
			1,
			people,
			now,
		);
		expect(again.events).toHaveLength(4);
		expect(again.events.every((event) => event.title === "Renamed")).toBe(true);
		expect(() => saveProgram(again, draft, 1, people, now)).toThrow("changed");
	});
	test("past sessions, explicit overrides and historical attendance survive", () => {
		const saved = saveProgram(base(), draft, 0, people, now);
		const first = saved.events.at(0);
		if (!first) throw new Error("Fixture event missing");
		const data = {
			...saved,
			events: saved.events.map((event, index) =>
				index === 1
					? { ...event, exception: true, title: "Manual override" }
					: event,
			),
			responses: [
				{
					eventId: first.id,
					personId: people.at(0) ?? "",
					response: "going",
					attendance: "present",
				} satisfies EventResponse,
			],
		};
		const next = saveProgram(
			data,
			{ ...draft, name: "Changed", status: "completed" },
			1,
			[],
			Date.parse("2026-10-26T12:00:00Z"),
		);
		expect(next.events.at(0)).toEqual(first);
		expect(next.events.at(1)?.title).toBe("Manual override");
		expect(next.events.at(2)?.cancelled).toBe(true);
		expect(next.responses.at(0)?.attendance).toBe("present");
	});
	test("program roster governs RSVP and removed members lose future bookings only", () => {
		const saved = saveProgram(base(), draft, 0, people, now);
		const event = saved.events.at(0);
		const member = saved.members.at(0);
		if (!event || !member) throw new Error("Fixture missing");
		expect(canRegister(member, event)).toBe(true);
		expect(canRegister({ ...member, programs: ["another"] }, event)).toBe(
			false,
		);
		const next = saveProgram(
			{
				...saved,
				responses: [
					{
						eventId: event.id,
						personId: member.id,
						response: "going",
						attendance: "unmarked",
					},
				],
			},
			draft,
			1,
			people.filter((id) => id !== member.id),
			now,
		);
		expect(next.responses.at(0)?.response).toBe("unavailable");
	});
	test("deadline defaults are idempotent and respect explicit answers, eligibility and capacity", () => {
		const saved = saveProgram(base(), draft, 0, people, now);
		const event = saved.events.at(0);
		if (!event) throw new Error("Fixture missing");
		const constrained: ClubEvent = { ...event, capacity: 1 };
		const explicit: EventResponse[] = [
			{
				eventId: event.id,
				personId: people.at(0) ?? "",
				response: "unavailable",
				attendance: "unmarked",
			},
		];
		const next = defaultProgramResponses(
			constrained,
			saved.members,
			explicit,
			event.closesAt ?? now,
		);
		expect(next.filter((entry) => entry.response === "going")).toHaveLength(1);
		expect(next.filter((entry) => entry.response === "waiting")).toHaveLength(
			1,
		);
		expect(next.at(0)).toEqual(explicit.at(0));
		expect(
			defaultProgramResponses(
				constrained,
				saved.members,
				next,
				event.closesAt ?? now,
			),
		).toEqual(next);
		expect(
			defaultProgramResponses(constrained, saved.members, explicit, now),
		).toEqual(explicit);
	});
	test("validates policy, season, roster and administrator boundaries", () => {
		expect(validateProgram(draft, base())).toBeUndefined();
		expect(
			validateProgram(
				{ ...draft, rsvp: { ...draft.rsvp, openDays: -1 } },
				base(),
			),
		).toContain("0–365");
		expect(validateProgram({ ...draft, seasonId: "other" }, base())).toContain(
			"season",
		);
		expect(() => saveProgram(base(), draft, 0, ["outside"], now)).toThrow(
			"active members",
		);
		const player = previewAccounts.find((account) => !account.admin);
		if (!player) throw new Error("Fixture missing");
		expect(() =>
			reduceApp(base(), player, {
				type: "save-program",
				draft,
				expectedRevision: 0,
				memberIds: people,
			}),
		).toThrow("access");
	});
	test("event editor preserves dynamic programs", () => {
		const event = saveProgram(base(), draft, 0, people, now).events.at(0);
		if (!event) throw new Error("Fixture missing");
		expect(eventDraft(event).program).toBe(draft.id);
		expect(eventDraft(event).programRsvp).toEqual(draft.rsvp);
	});
});
