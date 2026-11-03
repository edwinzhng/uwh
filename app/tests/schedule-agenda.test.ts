import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import {
	agendaEvents,
	changedPartResponse,
	partResponse,
	validatePartResponses,
} from "../src/domain/schedule-agenda";

const baseline = initialAppData.events.at(0);
if (!baseline) throw new Error("Missing fixture event");
const event = (id: string, date: string, program = "club"): ClubEvent => ({
	...baseline,
	id,
	date,
	endDate: undefined,
	start: "18:00",
	end: "20:00",
	timeZone: "America/Edmonton",
	program,
	signup: "open",
	opensAt: undefined,
	closesAt: undefined,
	cancelled: false,
	parts: undefined,
});
const practice: ClubEvent = {
	...event("parts", "2099-01-01"),
	parts: [
		{
			id: "training",
			title: "Training",
			kind: "training",
			start: "18:00",
			end: "19:00",
		},
		{
			id: "hockey",
			title: "Hockey",
			kind: "hockey",
			start: "19:00",
			end: "20:00",
		},
	],
};
const unanswered: EventResponse = {
	eventId: practice.id,
	personId: primaryAccount.personId,
	response: "unanswered",
	attendance: "unmarked",
};
test("agenda shows only the most recent past event plus chronological upcoming events and filters both sections by program", (): void => {
	const events = [
		event("old", "2026-10-20"),
		event("youth-past", "2026-10-31", "youth"),
		event("recent", "2026-11-01"),
		event("second", "2026-11-05"),
		event("first", "2026-11-03"),
		event("youth-future", "2026-11-04", "youth"),
	];
	const now = Date.parse("2026-11-02T12:00:00Z");
	expect(agendaEvents(events, now).past?.id).toBe("recent");
	expect(agendaEvents(events, now).upcoming.map((entry) => entry.id)).toEqual([
		"first",
		"youth-future",
		"second",
	]);
	expect(agendaEvents(events, now, "youth").past?.id).toBe("youth-past");
	expect(
		agendaEvents(events, now, "youth").upcoming.map((entry) => entry.id),
	).toEqual(["youth-future"]);
	expect(agendaEvents(events, now, "missing")).toEqual({
		past: undefined,
		upcoming: [],
	});
});
test("an in-progress or multi-day event stays upcoming until its actual end, including timezone boundaries", (): void => {
	const active = event("active", "2026-11-02");
	const multi = { ...event("multi", "2026-11-01"), endDate: "2026-11-03" };
	const now = clubTimestamp(active.date, "19:00", active.timeZone);
	expect(
		agendaEvents([active, multi], now).upcoming.map((entry) => entry.id),
	).toEqual(["multi", "active"]);
	expect(
		agendaEvents(
			[active],
			clubTimestamp(active.date, active.end, active.timeZone),
		).past?.id,
	).toBe("active");
});
test("section responses persist independent yes, no and unanswered states without turning the other section into a decline", (): void => {
	const noTraining = {
		...unanswered,
		...changedPartResponse(practice, unanswered, "training", false),
	};
	expect(noTraining.response).toBe("unanswered");
	expect(partResponse(noTraining, "training")).toBe("unavailable");
	expect(partResponse(noTraining, "hockey")).toBe("unanswered");
	const hockey = {
		...noTraining,
		...changedPartResponse(practice, noTraining, "hockey", true),
	};
	expect(hockey.response).toBe("going");
	expect(hockey.partIds).toEqual(["hockey"]);
	expect(partResponse(hockey, "training")).toBe("unavailable");
	const both = {
		...hockey,
		...changedPartResponse(practice, hockey, "training", true),
	};
	expect(both.partIds).toBeUndefined();
	expect(both.declinedPartIds).toEqual([]);
	expect(partResponse(both, "hockey")).toBe("going");
	const neither = {
		...noTraining,
		...changedPartResponse(practice, noTraining, "hockey", false),
	};
	expect(neither.response).toBe("unavailable");
	expect(neither.declinedPartIds).toEqual(["training", "hockey"]);
});
test("legacy all-session and selected-section responses retain their meaning", (): void => {
	expect(partResponse({ ...unanswered, response: "going" }, "training")).toBe(
		"going",
	);
	expect(
		partResponse(
			{ ...unanswered, response: "going", partIds: ["hockey"] },
			"training",
		),
	).toBe("unavailable");
	expect(
		partResponse(
			{
				...unanswered,
				response: "waiting",
				partIds: ["hockey"],
				declinedPartIds: [],
			},
			"training",
		),
	).toBe("unanswered");
	expect(
		partResponse(
			{
				...unanswered,
				response: "waiting",
				partIds: ["hockey"],
				declinedPartIds: [],
			},
			"hockey",
		),
	).toBe("waiting");
});
test("response validation rejects unknown sections, contradictory yes/no choices, and forged overall states", (): void => {
	expect(() =>
		validatePartResponses(practice, "going", ["hockey"], ["training"]),
	).not.toThrow();
	expect(() =>
		validatePartResponses(practice, "going", ["hockey"], ["hockey"]),
	).toThrow();
	expect(() =>
		validatePartResponses(practice, "unavailable", undefined, ["training"]),
	).toThrow();
	expect(() =>
		validatePartResponses(practice, "unanswered", undefined, [
			"training",
			"hockey",
		]),
	).toThrow();
	expect(() =>
		validatePartResponses(practice, "unanswered", undefined, ["foreign"]),
	).toThrow();
});
test("the actual RSVP reducer saves independent section choices and still protects reserved-series absence reasons", (): void => {
	const data = {
		...initialAppData,
		events: [practice],
		responses: [unanswered],
	};
	const choice = changedPartResponse(practice, unanswered, "hockey", true);
	const saved = reduceApp(data, primaryAccount, {
		type: "respond",
		eventId: practice.id,
		personId: primaryAccount.personId,
		...choice,
	});
	const response = saved.responses.find(
		(entry) =>
			entry.eventId === practice.id &&
			entry.personId === primaryAccount.personId,
	);
	expect(response?.partIds).toEqual(["hockey"]);
	expect(response?.declinedPartIds).toEqual([]);
	const reserved = {
		...data,
		responses: [
			{ ...unanswered, response: "going" as const, seriesExpected: true },
		],
	};
	expect(() =>
		reduceApp(reserved, primaryAccount, {
			type: "respond",
			eventId: practice.id,
			personId: primaryAccount.personId,
			response: "unavailable",
			declinedPartIds: ["training", "hockey"],
		}),
	).toThrow("reason");
});

test("compact event time ranges keep AM/PM boundaries explicit", async (): Promise<void> => {
	const { eventTimeRange } = await import(
		"../src/domain/event-card-presentation"
	);
	expect(eventTimeRange("19:00", "19:45")).toBe("7–7:45 PM");
	expect(eventTimeRange("11:00", "13:30")).toBe("11 AM–1:30 PM");
	expect(eventTimeRange("00:00", "01:00")).toBe("12–1 AM");
});
