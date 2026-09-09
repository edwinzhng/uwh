import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent, EventDraft } from "../src/domain/app-types";
import {
	toggleEventParts,
	updateEventPartTime,
} from "../src/domain/event-part-draft";
import {
	editedOccurrences,
	eligibleResponses,
	eventDraft,
} from "../src/domain/event-recurrence";
import { validatePracticeParts } from "../src/domain/practice-parts";

const draft: EventDraft = {
	title: "Thursday practice",
	date: "2026-10-01",
	start: "19:45",
	end: "21:30",
	venue: "Pool",
	program: "club",
	kind: "hockey",
	capacity: 24,
	repeat: "weekly",
	occurrences: 3,
	description: "",
};
const combined = toggleEventParts(draft, true);
const base: ClubEvent = {
	...combined,
	id: "first",
	date: "2026-10-01",
	seriesId: "thursdays",
	signup: "open",
	cancelled: false,
};
const events: ClubEvent[] = [
	base,
	{ ...base, id: "second", date: "2026-10-08" },
];
const now = Date.parse("2026-09-01T12:00:00Z");

test("optional parts retain the overall time and share an editable split", (): void => {
	expect(combined.parts?.map((part) => part.id)).toEqual([
		"training",
		"hockey",
	]);
	expect(validatePracticeParts(combined)).toBeUndefined();
	expect(combined.parts?.at(0)?.end).toBe("20:30");
	const split = updateEventPartTime(combined, "training", "end", "20:30");
	expect(split.parts?.at(1)?.start).toBe("20:30");
	expect(split.start).toBe("19:45");
	expect(split.end).toBe("21:30");
	const later = updateEventPartTime(split, "hockey", "start", "20:45");
	expect(later.parts?.at(0)?.end).toBe("20:45");
	const shorter = updateEventPartTime(later, "hockey", "end", "21:15");
	expect(shorter.end).toBe("21:15");
	expect(validatePracticeParts(shorter)).toBeUndefined();
	expect(toggleEventParts(shorter, false).parts).toBeUndefined();
	expect(draft.parts).toBeUndefined();
});

test("single edits preserve part identity without changing the rest of the series", (): void => {
	const edit = updateEventPartTime(
		eventDraft(base),
		"training",
		"end",
		"20:30",
	);
	const changed = editedOccurrences(events, base, edit, "single", now);
	expect(changed.at(0)?.parts).toEqual(edit.parts);
	expect(changed.at(0)?.parts?.map((part) => part.id)).toEqual([
		"training",
		"hockey",
	]);
	expect(changed.at(1)).toEqual(events.at(1));
});

test("series rebuild preserves part IDs on existing and new dates and retains exceptions", (): void => {
	const changed = editedOccurrences(
		events,
		base,
		{ ...combined, rebuild: true },
		"series",
		now,
		"revision",
	);
	expect(changed).toHaveLength(3);
	expect(
		changed.every(
			(event) => JSON.stringify(event.parts) === JSON.stringify(combined.parts),
		),
	).toBe(true);
	const single = changed.at(1);
	if (!single) throw new Error("Missing second practice");
	const exception = {
		...single,
		exception: true,
		parts: undefined,
		kind: "hockey" as const,
	};
	const rebuilt = editedOccurrences(
		changed.map((event) => (event.id === single.id ? exception : event)),
		base,
		{ ...combined, rebuild: true },
		"series",
		now,
		"next",
	);
	expect(
		rebuilt.find((event) => event.id === single.id)?.parts,
	).toBeUndefined();
});

test("removing selected parts resets partial RSVPs rather than registering the whole practice", (): void => {
	const data = {
		...initialAppData,
		responses: [
			{
				eventId: base.id,
				personId: "sam",
				response: "going" as const,
				attendance: "present" as const,
				partIds: ["hockey"],
				partAttendance: [{ partId: "hockey", attendance: "present" as const }],
			},
			{
				eventId: base.id,
				personId: "alex",
				response: "going" as const,
				attendance: "late" as const,
			},
		],
	};
	const removed = eligibleResponses(
		data,
		[{ ...base, parts: undefined }],
		[base.id],
	);
	expect(removed.at(0)).toMatchObject({
		response: "unanswered",
		attendance: "unmarked",
		partIds: undefined,
		partAttendance: undefined,
	});
	expect(removed.at(1)?.response).toBe("going");
	const preserved = eligibleResponses(data, events, [base.id]);
	expect(preserved.at(0)?.partIds).toEqual(["hockey"]);
	expect(preserved.at(0)?.attendance).toBe("present");
});
