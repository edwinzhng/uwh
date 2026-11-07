import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test";
import ICAL from "ical.js";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import {
	calendarUid,
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../src/domain/calendar-export";
import { isHostedCalendarOrigin } from "../src/domain/calendar-links";
import { defaultProgramRsvp } from "../src/domain/program-rsvp";

const practice: ClubEvent = {
	id: "practice",
	title: "Training",
	date: "2026-09-10",
	start: "19:45",
	end: "21:00",
	venue: "MNP Centre",
	program: "club",
	kind: "training",
	signup: "open",
	capacity: 20,
	description: "Bring your kit.",
	cancelled: false,
};
const response: EventResponse = {
	eventId: practice.id,
	personId: "alex",
	response: "going",
	attendance: "unmarked",
};
const projection = personalCalendarEvents(
	[practice],
	[response],
	"alex",
	["club"],
	false,
);
const now = Date.parse("2026-09-08T18:00:00Z");
const entries = reconcileCalendar([], projection, "club", "alex", now);

test("practice parts export separately and removing one preserves the other UID", (): void => {
	const combined: ClubEvent = {
		...practice,
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: "19:45",
				end: "20:15",
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: "20:15",
				end: "21:00",
			},
		],
	};
	const both = personalCalendarEvents(
		[combined],
		[response],
		"alex",
		["club"],
		false,
	);
	const hockey = personalCalendarEvents(
		[combined],
		[{ ...response, declinedPartIds: ["training"] }],
		"alex",
		["club"],
		false,
	);
	expect(both).toHaveLength(2);
	expect(hockey).toHaveLength(1);
	const legacy = reconcileCalendar([], projection, "club", "alex", now);
	const original = reconcileCalendar(legacy, both, "club", "alex", now + 1000);
	expect(
		original.find((entry) => entry.uid === legacy.at(0)?.uid)?.status,
	).toBe("CANCELLED");
	const parsed = new ICAL.Component(
		ICAL.parse(renderCalendar("Crocs", original)),
	);
	const active = parsed
		.getAllSubcomponents("vevent")
		.filter((entry) => entry.getFirstPropertyValue("status") === "CONFIRMED")
		.map((entry) => new ICAL.Event(entry));
	expect(active.map((entry) => entry.summary)).toEqual([
		"Training (Training)",
		"Training (Hockey)",
	]);
	expect(active.map((entry) => entry.duration.toSeconds())).toEqual([
		1800, 2700,
	]);
	expect(active.at(1)?.component.getFirstPropertyValue("url")).toBe(
		"https://app.calgaryuwh.com/session?event=practice&part=hockey",
	);
	const updated = reconcileCalendar(
		original,
		hockey,
		"club",
		"alex",
		now + 2000,
	);
	expect(
		updated.find((entry) => entry.title === "Training (Training)")?.status,
	).toBe("CANCELLED");
	expect(
		updated.find((entry) => entry.title === "Training (Hockey)")?.uid,
	).toBe(active.at(1)?.uid);

	expect(
		personalCalendarEvents(
			[combined],
			[{ ...response, partIds: ["removed"] }],
			"alex",
			["club"],
			false,
		),
	).toHaveLength(0);
});

test("a standard calendar parser reads UTC times and identity", (): void => {
	const calendar = new ICAL.Component(
		ICAL.parse(renderCalendar("Crocs · Alex", entries)),
	);
	const component = calendar.getFirstSubcomponent("vevent");
	if (!component) throw new Error("Missing calendar event.");
	const event = new ICAL.Event(component);
	expect(event.summary).toBe("Training");
	expect(event.startDate.toJSDate().toISOString()).toBe(
		"2026-09-11T01:45:00.000Z",
	);
	expect(event.endDate.toJSDate().toISOString()).toBe(
		"2026-09-11T03:00:00.000Z",
	);
	expect(event.uid).toBe(calendarUid("club", "alex", "practice"));
	expect(event.component.getFirstPropertyValue("status")).toBe("CONFIRMED");
	expect(event.component.getFirstPropertyValue("transp")).toBe("OPAQUE");
	expect(event.component.getAllProperties("attendee")).toHaveLength(0);
});

test("unanswered practices stay tentative through signup close and cancel at the start", (): void => {
	const start = Date.parse("2026-09-11T01:45:00Z");
	const event = {
		...practice,
		opensAt: start - 3600000,
		closesAt: start - 1800000,
	};
	const at = (
		time: number,
		replies: EventResponse[] = [],
	): ReturnType<typeof personalCalendarEvents> =>
		personalCalendarEvents([event], replies, "alex", ["club"], false, time);
	const scheduled = at(start - 3600001);
	expect(scheduled.at(0)?.title).toBe("Signup not open yet · Training");
	expect(scheduled.at(0)?.status).toBe("TENTATIVE");
	expect(at(start - 3600000).at(0)?.title).toBe("RSVP needed · Training");
	const closed = at(start - 1);
	expect(closed.at(0)?.title).toBe("Signup closed · Training");
	const before = reconcileCalendar([], closed, "club", "alex", start - 1);
	const cancelled = reconcileCalendar(before, at(start), "club", "alex", start);
	expect(cancelled.at(0)).toMatchObject({
		uid: before.at(0)?.uid,
		status: "CANCELLED",
	});
	const yes = reconcileCalendar(
		before,
		at(start - 1, [response]),
		"club",
		"alex",
		start,
	);
	expect(yes.at(0)).toMatchObject({
		uid: before.at(0)?.uid,
		status: "CONFIRMED",
	});
	expect(at(start - 1, [{ ...response, response: "unavailable" }])).toEqual([]);
	expect(
		at(start, [
			{ ...response, response: "unanswered", attendance: "present" },
		]).at(0)?.status,
	).toBe("CONFIRMED");
});

test("UTF-8 folding and text escaping preserve content without injecting events", (): void => {
	const title = "🏊 Crocs, club; \\ fins é".repeat(12);
	const description =
		"Bring kit\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:Injected";
	const changed = entries.map((entry) => ({ ...entry, title, description }));
	const output = renderCalendar("Crocs\nBEGIN:VEVENT", changed);
	for (const line of output.split("\r\n"))
		expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
	const calendar = new ICAL.Component(ICAL.parse(output));
	expect(calendar.getAllSubcomponents("vevent")).toHaveLength(1);
	const component = calendar.getFirstSubcomponent("vevent");
	if (!component) throw new Error("Missing calendar event.");
	const event = new ICAL.Event(component);
	expect(event.summary).toBe(title);
	expect(event.description).toBe(description.replaceAll("\r\n", "\n"));
});

test("personal feeds enforce eligibility and keep waitlists optional", (): void => {
	expect(
		personalCalendarEvents(
			[{ ...practice, programRsvp: defaultProgramRsvp() }],
			[response],
			"sam",
			["youth"],
			false,
		),
	).toHaveLength(0);
	expect(
		personalCalendarEvents(
			[{ ...practice, eligiblePersonIds: ["sam"] }],
			[response],
			"alex",
			["club"],
			false,
		),
	).toHaveLength(0);
	expect(
		personalCalendarEvents(
			[{ ...practice, cancelled: true }],
			[response],
			"alex",
			["club"],
			false,
		),
	).toHaveLength(0);
	for (const state of ["unavailable", "waiting"] as const)
		expect(
			personalCalendarEvents(
				[practice],
				[{ ...response, response: state }],
				"alex",
				["club"],
				false,
			),
		).toHaveLength(0);
	const waiting = personalCalendarEvents(
		[practice],
		[{ ...response, response: "waiting" }],
		"alex",
		["club"],
		true,
	);
	expect(waiting.at(0)?.status).toBe("TENTATIVE");
	expect(waiting.at(0)?.title).toBe("Waitlisted · Training");
	expect(
		personalCalendarEvents(
			[practice],
			[{ ...response, attendance: "absent" }],
			"alex",
			["club"],
			false,
		),
	).toHaveLength(1);
});

test("withdrawal, rejoining and schedule edits keep the UID and advance revisions", (): void => {
	expect(
		reconcileCalendar(entries, projection, "club", "alex", now + 1000),
	).toEqual(entries);
	const cancelled = reconcileCalendar(entries, [], "club", "alex", now + 2000);
	expect(cancelled.at(0)?.status).toBe("CANCELLED");
	expect(cancelled.at(0)?.sequence).toBe(1);
	expect(reconcileCalendar(cancelled, [], "club", "alex", now + 3000)).toEqual(
		cancelled,
	);
	const rejoined = reconcileCalendar(
		cancelled,
		projection,
		"club",
		"alex",
		now + 4000,
	);
	expect(rejoined.at(0)?.sequence).toBe(2);
	expect(rejoined.at(0)?.uid).toBe(entries.at(0)?.uid);
	const revised = reconcileCalendar(
		rejoined,
		projection.map((event) => ({
			...event,
			title: "Evening hockey",
			start: event.start + 3600000,
			end: event.end + 3600000,
			location: "New pool",
		})),
		"club",
		"alex",
		now + 5000,
	);
	expect(revised.at(0)?.sequence).toBe(3);
	expect(revised.at(0)?.uid).toBe(entries.at(0)?.uid);
});

test("family feeds stay independent as a parent changes one child’s response", (): void => {
	const current = personalCalendarEvents(
		initialAppData.events,
		initialAppData.responses,
		"sam",
		["youth", "club"],
		false,
	);
	const mila = personalCalendarEvents(
		initialAppData.events,
		initialAppData.responses,
		"mila",
		["youth"],
		false,
	);
	const updated = reduceApp(
		initialAppData,
		{ ...primaryAccount, children: ["sam", "mila"] },
		{
			type: "respond",
			eventId: "youth-thu",
			personId: "sam",
			response: "unavailable",
		},
	);
	expect(
		personalCalendarEvents(
			updated.events,
			updated.responses,
			"sam",
			["youth", "club"],
			false,
		).length,
	).toBe(current.length - 1);
	expect(
		personalCalendarEvents(
			updated.events,
			updated.responses,
			"mila",
			["youth"],
			false,
		),
	).toEqual(mila);
	expect(calendarUid("club", "mila", "youth-thu")).not.toBe(
		calendarUid("club", "sam", "youth-thu"),
	);
});

test("local/private hosts never advertise Google connectivity", (): void => {
	for (const origin of [
		undefined,
		"not a url",
		"http://127.0.0.1:3211",
		"https://127.0.0.1",
		"https://10.0.0.1",
		"https://localhost",
		"https://host.local",
		"https://host.internal",
	])
		expect(isHostedCalendarOrigin(origin)).toBe(false);
	expect(isHostedCalendarOrigin("https://crocs.convex.site")).toBe(true);
});

beforeEach((): void => {
	setSystemTime(new Date("2026-09-08T18:00:00Z"));
});
afterEach((): void => {
	setSystemTime();
});
