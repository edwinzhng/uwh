import { expect, test } from "bun:test";
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

test("only personal going responses export; waitlisted events are optional and tentative", (): void => {
	expect(
		personalCalendarEvents([practice], [response], "sam", ["club"], false),
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
	for (const state of ["unavailable", "unanswered", "waiting"] as const)
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
	const updated = reduceApp(initialAppData, primaryAccount, {
		type: "respond",
		eventId: "youth-thu",
		personId: "sam",
		response: "unavailable",
	});
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
