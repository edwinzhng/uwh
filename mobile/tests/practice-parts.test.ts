import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import { eventAttendees, eventResponse } from "../src/domain/app-rules";
import type { Account, AppData, ClubEvent } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { eventDraft } from "../src/domain/event-recurrence";
import {
	attendanceForPart,
	validatePracticeParts,
} from "../src/domain/practice-parts";

const event: ClubEvent = {
	id: "combined",
	title: "Thursday practice",
	date: "2099-10-01",
	start: "19:45",
	end: "21:30",
	venue: "Pool",
	program: "club",
	kind: "training",
	capacity: 24,
	description: "",
	cancelled: false,
	signup: "open",
	opensAt: 0,
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
const data: AppData = { ...initialAppData, events: [event], responses: [] };
const parent: Account = { ...primaryAccount, admin: false, coachPrograms: [] };
const coach: Account = { ...primaryAccount, admin: false };

test("partial RSVPs isolate family profiles and part rosters", (): void => {
	const sam = reduceApp(data, parent, {
		type: "respond",
		eventId: event.id,
		personId: "sam",
		response: "going",
		partIds: ["hockey"],
	});
	const both = reduceApp(sam, parent, {
		type: "respond",
		eventId: event.id,
		personId: "mila",
		response: "going",
	});
	expect(
		eventAttendees(both, event.id)
			.map((member) => member.id)
			.toSorted(),
	).toEqual(["mila", "sam"]);
	expect(
		eventAttendees(both, event.id, "training").map((member) => member.id),
	).toEqual(["mila"]);
	expect(eventAttendees(both, event.id, "hockey")).toHaveLength(2);
	expect(eventResponse(both, event.id, "sam").partIds).toEqual(["hockey"]);
	expect(eventResponse(both, event.id, "mila").partIds).toBeUndefined();
	expect(() =>
		reduceApp(both, parent, {
			type: "respond",
			eventId: event.id,
			personId: "taylor",
			response: "going",
			partIds: ["hockey"],
		}),
	).toThrow("access");
});

test("part selection validates against the practice and simple hockey needs no selection", (): void => {
	for (const partIds of [[], ["training", "training"], ["missing"]]) {
		expect(() =>
			reduceApp(data, parent, {
				type: "respond",
				eventId: event.id,
				personId: "sam",
				response: "going",
				partIds,
			}),
		).toThrow("valid practice parts");
	}
	const friday: AppData = {
		...data,
		events: [{ ...event, kind: "hockey", parts: undefined }],
	};
	expect(() =>
		reduceApp(friday, parent, {
			type: "respond",
			eventId: event.id,
			personId: "sam",
			response: "going",
			partIds: ["hockey"],
		}),
	).toThrow();
	const joined = reduceApp(friday, parent, {
		type: "respond",
		eventId: event.id,
		personId: "sam",
		response: "going",
	});
	expect(eventResponse(joined, event.id, "sam").response).toBe("going");
	expect(eventResponse(joined, event.id, "sam").partIds).toBeUndefined();
});

test("waitlist promotion keeps a player's chosen part", (): void => {
	const limited: AppData = { ...data, events: [{ ...event, capacity: 1 }] };
	const first = reduceApp(limited, parent, {
		type: "respond",
		eventId: event.id,
		personId: "sam",
		response: "going",
	});
	const waiting = reduceApp(first, parent, {
		type: "respond",
		eventId: event.id,
		personId: "mila",
		response: "going",
		partIds: ["hockey"],
	});
	expect(eventResponse(waiting, event.id, "mila")).toMatchObject({
		response: "waiting",
		partIds: ["hockey"],
	});
	const promoted = reduceApp(waiting, parent, {
		type: "respond",
		eventId: event.id,
		personId: "sam",
		response: "unavailable",
	});
	expect(eventResponse(promoted, event.id, "mila")).toMatchObject({
		response: "going",
		partIds: ["hockey"],
	});
	expect(eventAttendees(promoted, event.id, "training")).toHaveLength(0);
});

test("coaches mark only registered parts and hockey-only players are not absent from training", (): void => {
	const joined = reduceApp(data, parent, {
		type: "respond",
		eventId: event.id,
		personId: "sam",
		response: "going",
		partIds: ["hockey"],
	});
	expect(() =>
		reduceApp(joined, parent, {
			type: "attendance",
			eventId: event.id,
			personId: "sam",
			partId: "hockey",
			attendance: "late",
		}),
	).toThrow("access");
	expect(() =>
		reduceApp(joined, coach, {
			type: "attendance",
			eventId: event.id,
			personId: "sam",
			partId: "training",
			attendance: "absent",
		}),
	).toThrow("not registered");
	const marked = reduceApp(joined, coach, {
		type: "attendance",
		eventId: event.id,
		personId: "sam",
		attendance: "present",
	});
	const response = eventResponse(marked, event.id, "sam");
	expect(response.attendance).toBe("present");
	expect(attendanceForPart(response, "training")).toBe("unmarked");
	expect(attendanceForPart(response, "hockey")).toBe("present");
	expect(() =>
		reduceApp({ ...marked, events: [{ ...event, cancelled: true }] }, coach, {
			type: "attendance",
			eventId: event.id,
			personId: "sam",
			attendance: "late",
		}),
	).toThrow("unavailable");
});

test("part edits preserve untouched legacy marks and require all selected parts to be recorded", (): void => {
	const legacy: AppData = {
		...data,
		responses: [
			{
				eventId: event.id,
				personId: "sam",
				response: "going",
				attendance: "present",
			},
		],
	};
	const revised = reduceApp(legacy, coach, {
		type: "attendance",
		eventId: event.id,
		personId: "sam",
		partId: "hockey",
		attendance: "late",
	});
	const response = eventResponse(revised, event.id, "sam");
	expect(attendanceForPart(response, "training")).toBe("present");
	expect(response.attendance).toBe("late");
	const unfinished = reduceApp(data, coach, {
		type: "attendance",
		eventId: event.id,
		personId: "mila",
		partId: "training",
		attendance: "present",
	});
	expect(eventResponse(unfinished, event.id, "mila").attendance).toBe(
		"unmarked",
	);
	const finished = reduceApp(unfinished, coach, {
		type: "attendance",
		eventId: event.id,
		personId: "mila",
		partId: "hockey",
		attendance: "present",
	});
	expect(eventResponse(finished, event.id, "mila").attendance).toBe("present");
});

test("peer attendance details stay private while a linked guardian can see their child", (): void => {
	const marked = reduceApp(data, coach, {
		type: "attendance",
		eventId: event.id,
		personId: "sam",
		partId: "hockey",
		attendance: "late",
	});
	const guardian = visibleAppData(marked, parent);
	expect(eventResponse(guardian, event.id, "sam").partAttendance).toBeDefined();
	const peer: Account = {
		id: "peer",
		personId: "taylor",
		name: "Taylor",
		children: [],
		coachPrograms: [],
		admin: false,
	};
	const visible = eventResponse(visibleAppData(marked, peer), event.id, "sam");
	expect(visible.partAttendance).toBeUndefined();
	expect(visible.attendance).toBe("unmarked");
});

test("practice structure rejects overlaps, mismatched bounds and duplicate activity labels", (): void => {
	const draft = eventDraft(event);
	expect(validatePracticeParts(draft)).toBeUndefined();
	expect(validatePracticeParts({ ...draft, start: "19:30" })).toBeDefined();
	expect(
		validatePracticeParts({
			...draft,
			parts: draft.parts?.map((part) => ({ ...part, title: "Training" })),
		}),
	).toBeDefined();
	expect(
		validatePracticeParts({
			...draft,
			parts: draft.parts?.map((part) => ({ ...part, kind: "hockey" })),
		}),
	).toBeUndefined();
	expect(
		validatePracticeParts({
			...draft,
			parts: draft.parts?.map((part) =>
				part.id === "training" ? { ...part, end: "20:45" } : part,
			),
		}),
	).toBeDefined();
});
