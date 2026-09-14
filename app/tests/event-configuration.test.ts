import { expect, test } from "bun:test";
import { createOccurrences, validateEvent } from "../src/domain/app-rules";
import type { EventDraft } from "../src/domain/app-types";
import {
	editedOccurrences,
	eventDraft,
	occurrenceDates,
} from "../src/domain/event-recurrence";
import { clubTimestamp, signupWindow } from "../src/domain/event-time";

const draft: EventDraft = {
	title: "Practice",
	date: "2026-09-17",
	start: "19:00",
	end: "21:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	description: "",
	repeat: "weekly",
};
test("custom weekly cadence includes explicit end date", (): void => {
	expect(
		occurrenceDates({ ...draft, repeatInterval: 3, repeatUntil: "2026-10-29" }),
	).toEqual(["2026-09-17", "2026-10-08", "2026-10-29"]);
	expect(validateEvent({ ...draft, repeatInterval: 0 })).toBeDefined();
	expect(validateEvent({ ...draft, repeatUntil: "2026-09-01" })).toBeDefined();
});
test("registration uses Monday of previous week at noon and custom closing hours", (): void => {
	const configured = {
		...draft,
		registrationOpen: { weeksBefore: 1, weekday: 1, time: "12:00" },
		registrationCloseHours: 2.5,
	};
	const window = signupWindow(draft.date, configured, 0);
	expect(window.opensAt).toBe(clubTimestamp("2026-09-07", "12:00"));
	expect(window.closesAt).toBe(clubTimestamp(draft.date, "16:30"));
	const event = createOccurrences("test", configured).at(0);
	if (!event) throw new Error("Missing event");
	expect(eventDraft(event).registrationOpen).toEqual(
		configured.registrationOpen,
	);
	const changed = editedOccurrences(
		[event],
		event,
		{ ...eventDraft(event), date: "2026-09-24" },
		"single",
		0,
	).at(0);
	expect(changed?.opensAt).toBe(clubTimestamp("2026-09-14", "12:00"));
});
test("capacity is optional and three practice sections are valid", (): void => {
	expect(validateEvent({ ...draft, repeat: "once" })).toBeUndefined();
	expect(validateEvent({ ...draft, capacity: 0 })).toBeDefined();
	expect(
		validateEvent({
			...draft,
			parts: [
				{
					id: "warmup",
					title: "Warm up",
					kind: "training",
					start: "19:00",
					end: "19:15",
				},
				{
					id: "skills",
					title: "Skills",
					kind: "training",
					start: "19:15",
					end: "20:00",
				},
				{
					id: "game",
					title: "Hockey",
					kind: "hockey",
					start: "20:00",
					end: "21:00",
				},
			],
		}),
	).toBeUndefined();
});
