import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { createOccurrences, validateEvent } from "../src/domain/app-rules";
import type {
	AppData,
	ClubEvent,
	EventDraft,
	EventResponse,
} from "../src/domain/app-types";
import {
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../src/domain/calendar-export";
import { completedCoachingEvent } from "../src/domain/coaching-hours";
import { editedOccurrences, eventDraft } from "../src/domain/event-recurrence";
import { clubDate, clubTimestamp, signupState } from "../src/domain/event-time";
import { defaultClubTimeZone, validTimeZone } from "../src/domain/time-zones";

const draft: EventDraft = {
	title: "Thursday practice",
	date: "2027-01-14",
	start: "19:45",
	end: "21:30",
	venue: "Pool",
	program: "club",
	kind: "training",
	capacity: 24,
	repeat: "once",
	description: "",
	timeZone: "America/New_York",
	signupCloses: "start",
	parts: [
		{
			id: "training",
			title: "Training",
			kind: "training",
			start: "19:45",
			end: "20:30",
		},
		{
			id: "hockey",
			title: "Hockey",
			kind: "hockey",
			start: "20:30",
			end: "21:30",
		},
	],
};
const firstEvent = (events: ClubEvent[]): ClubEvent => {
	const event = events.at(0);
	if (!event) throw new Error("Missing event fixture");
	return event;
};
const settings = (data: AppData, timeZone: string): AppData =>
	reduceApp(data, primaryAccount, {
		type: "settings",
		clubName: data.clubName,
		reminders: data.reminders,
		timeZone,
	});

test("timezone settings require admin access and a supported IANA zone", (): void => {
	expect(validTimeZone("America/New_York")).toBe(true);
	expect(validTimeZone("Asia/Kolkata")).toBe(true);
	expect(validTimeZone("UTC")).toBe(true);
	for (const value of ["Mars/Olympus", "UTC+6", "", "America/New_York "])
		expect(() => settings(initialAppData, value)).toThrow("valid timezone");
	expect(() =>
		reduceApp(
			initialAppData,
			{ ...primaryAccount, admin: false },
			{
				type: "settings",
				clubName: "Club",
				reminders: true,
				timeZone: "America/New_York",
			},
		),
	).toThrow("access");
});

test("changing club timezone never retimes existing or legacy events", (): void => {
	const stored = firstEvent(createOccurrences("stored", draft));
	const legacy = firstEvent(initialAppData.events);
	const data: AppData = { ...initialAppData, events: [stored, legacy] };
	const instants = data.events.map((event) =>
		clubTimestamp(event.date, event.start, event.timeZone),
	);
	const updated = settings(data, "Asia/Tokyo");
	expect(updated.timeZone).toBe("Asia/Tokyo");
	expect(updated.events).toEqual(data.events);
	expect(
		updated.events.map((event) =>
			clubTimestamp(event.date, event.start, event.timeZone),
		),
	).toEqual(instants);
	expect(legacy.timeZone).toBeUndefined();
	expect(clubTimestamp(legacy.date, legacy.start)).toBe(
		clubTimestamp(legacy.date, legacy.start, defaultClubTimeZone),
	);
});

test("new events use the club timezone even when the caller supplies another zone", (): void => {
	const club = settings(initialAppData, "America/New_York");
	const updated = reduceApp(club, primaryAccount, {
		type: "create-event",
		id: "new-zone",
		draft: { ...draft, timeZone: "Asia/Tokyo" },
	});
	const event = updated.events.find((entry) => entry.id === "new-zone-0");
	expect(event?.timeZone).toBe("America/New_York");
	expect(event?.closesAt).toBe(Date.parse("2027-01-15T00:45:00Z"));
	const defaultEvent = reduceApp(initialAppData, primaryAccount, {
		type: "create-event",
		id: "legacy-zone",
		draft,
	}).events.find((entry) => entry.id === "legacy-zone-0");
	expect(defaultEvent?.timeZone).toBe(defaultClubTimeZone);
});

test("individual edits and series rebuilds preserve the original timezone", (): void => {
	const originals = createOccurrences("series", {
		...draft,
		date: "2027-03-07",
		repeat: "weekly",
		occurrences: 2,
	});
	const event = firstEvent(originals);
	const data: AppData = {
		...initialAppData,
		timeZone: "Asia/Tokyo",
		events: originals,
	};
	const edited = reduceApp(data, primaryAccount, {
		type: "edit-event",
		eventId: event.id,
		scope: "single",
		draft: {
			...eventDraft(event),
			timeZone: "Pacific/Auckland",
			title: "Updated practice",
		},
	});
	expect(firstEvent(edited.events).timeZone).toBe("America/New_York");
	expect(firstEvent(edited.events).closesAt).toBe(event.closesAt);
	const rebuilt = editedOccurrences(
		originals,
		event,
		{
			...eventDraft(event),
			timeZone: "Asia/Tokyo",
			repeat: "weekly",
			occurrences: 3,
			rebuild: true,
		},
		"series",
		Date.parse("2027-01-01T00:00:00Z"),
		"rebuild-zone",
	);
	expect(rebuilt).toHaveLength(3);
	expect(rebuilt.map((entry) => entry.timeZone)).toEqual(
		Array.from({ length: 3 }, () => "America/New_York"),
	);
	expect(rebuilt.map((entry) => entry.start)).toEqual(
		Array.from({ length: 3 }, () => "19:45"),
	);
	expect(rebuilt.at(1)?.closesAt).toBe(Date.parse("2027-03-14T23:45:00Z"));
});

test("New York recurrences follow daylight saving while preserving local practice times", (): void => {
	const spring = createOccurrences("spring", {
		...draft,
		date: "2027-03-07",
		repeat: "weekly",
		occurrences: 2,
	});
	expect((spring.at(1)?.closesAt ?? 0) - (spring.at(0)?.closesAt ?? 0)).toBe(
		167 * 3600000,
	);
	const fall = createOccurrences("fall", {
		...draft,
		date: "2027-10-31",
		repeat: "weekly",
		occurrences: 2,
	});
	expect((fall.at(1)?.closesAt ?? 0) - (fall.at(0)?.closesAt ?? 0)).toBe(
		169 * 3600000,
	);
	for (const [date, start, end] of [
		["2027-03-14", "02:30", "04:00"],
		["2027-11-07", "01:30", "03:00"],
	])
		expect(
			validateEvent({
				...draft,
				date: date ?? "",
				start: start ?? "",
				end: end ?? "",
				parts: undefined,
			}),
		).toBeDefined();
});

test("nonexistent and ambiguous internal part times are rejected before export", (): void => {
	for (const [date, split] of [
		["2027-03-14", "02:30"],
		["2027-11-07", "01:30"],
	] as const)
		expect(
			validateEvent({
				...draft,
				date,
				start: "00:30",
				end: "04:00",
				parts: [
					{
						id: "training",
						title: "Training",
						kind: "training",
						start: "00:30",
						end: split,
					},
					{
						id: "hockey",
						title: "Hockey",
						kind: "hockey",
						start: split,
						end: "04:00",
					},
				],
			}),
		).toBeDefined();
});

test("calendar exports use the event timezone for whole and partial practices", (): void => {
	const event = firstEvent(createOccurrences("calendar", draft));
	const response: EventResponse = {
		eventId: event.id,
		personId: "alex",
		response: "going",
		attendance: "unmarked",
	};
	const all = personalCalendarEvents(
		[event],
		[response],
		"alex",
		["club"],
		false,
	);
	const hockey = personalCalendarEvents(
		[event],
		[{ ...response, partIds: ["hockey"] }],
		"alex",
		["club"],
		false,
	);
	expect(all.at(0)?.start).toBe(Date.parse("2027-01-15T00:45:00Z"));
	expect(hockey.at(0)?.start).toBe(Date.parse("2027-01-15T01:30:00Z"));
	expect(hockey.at(0)?.end).toBe(Date.parse("2027-01-15T02:30:00Z"));
	const entries = reconcileCalendar(
		[],
		hockey,
		"club",
		"alex",
		Date.parse("2027-01-01T00:00:00Z"),
	);
	expect(renderCalendar("Club", entries)).toContain("DTSTART:20270115T013000Z");
});

test("date boundaries, signup closure and completed attendance use the event zone", (): void => {
	const midnight = Date.parse("2027-01-01T00:30:00Z");
	expect(clubDate(midnight, "America/New_York")).toBe("2026-12-31");
	expect(clubDate(midnight, "Asia/Tokyo")).toBe("2027-01-01");
	const event = firstEvent(createOccurrences("boundary", draft));
	const closesAt = Date.parse("2027-01-15T00:45:00Z");
	expect(signupState(event, closesAt - 1)).toBe("open");
	expect(signupState(event, closesAt)).toBe("closed");
	expect(
		completedCoachingEvent(event, Date.parse("2027-01-15T02:29:59Z")),
	).toBe(false);
	expect(
		completedCoachingEvent(event, Date.parse("2027-01-15T02:30:00Z")),
	).toBe(true);
});
