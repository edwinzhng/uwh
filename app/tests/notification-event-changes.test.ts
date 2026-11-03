import { expect, test } from "bun:test";
import {
	changedNotificationEvent,
	createdNotificationEvents,
	requiresSessionReminders,
} from "../convex/notification_event_changes";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent } from "../src/domain/app-types";

const base = initialAppData.events.at(0);
if (!base) throw new Error("Practice fixture required.");
const event = (id: string, extra: Partial<ClubEvent> = {}): ClubEvent => ({
	...base,
	program: "club",
	id,
	date: "2026-11-05",
	start: "19:00",
	end: "20:00",
	timeZone: "UTC",
	cancelled: false,
	...extra,
});
const now = Date.parse("2026-11-03T12:00:00Z");

test("new events notify whether registration is open now, unscheduled, or opens later", () => {
	for (const opensAt of [undefined, now - 1000, now, now + 1000])
		expect(
			createdNotificationEvents([], [event("new", { opensAt })], now).map(
				(item) => item.id,
			),
		).toEqual(["new"]);
});
test("created event delivery excludes cancelled, finished and existing records while retaining series coalescing", () => {
	const existing = event("existing");
	const first = event("first");
	expect(
		createdNotificationEvents(
			[existing],
			[
				existing,
				event("past", { date: "2026-11-01" }),
				event("cancelled", { cancelled: true }),
				first,
				event("second"),
				event("other", { program: "youth" }),
			],
			now,
		).map((item) => item.id),
	).toEqual(["first", "other"]);
	expect(
		createdNotificationEvents(
			[],
			[event("ongoing", { date: "2026-11-01", endDate: "2026-11-05" })],
			now,
		).map((item) => item.id),
	).toEqual(["ongoing"]);
});

test("club opening and closing reminder toggle does not silence new or changed event alerts", () => {
	for (const eventPhase of [undefined, "open", "closing"] as const)
		expect(
			requiresSessionReminders({ kind: "events", topic: "event", eventPhase }),
		).toBe(true);
	for (const eventPhase of ["created", "changed", "cancelled"] as const)
		expect(
			requiresSessionReminders({ kind: "events", topic: "event", eventPhase }),
		).toBe(false);
	for (const topic of ["lineup", "sessionPlan", "rsvpNo"] as const)
		expect(requiresSessionReminders({ kind: "events", topic })).toBe(false);
	expect(requiresSessionReminders({ kind: "messages" })).toBe(false);
});

test("participant edit alerts include multi-day dates, time zones and block timetable changes", () => {
	const before = event("same", {
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: "19:00",
				end: "19:30",
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: "19:30",
				end: "20:00",
			},
		],
	});
	expect(changedNotificationEvent(before, { ...before })).toBe(false);
	expect(
		changedNotificationEvent(before, {
			...before,
			editId: "new-internal-edit",
			exception: true,
		}),
	).toBe(false);
	expect(
		changedNotificationEvent(before, { ...before, endDate: "2026-11-07" }),
	).toBe(true);
	expect(
		changedNotificationEvent(before, {
			...before,
			timeZone: "America/Edmonton",
		}),
	).toBe(true);
	expect(
		changedNotificationEvent(before, {
			...before,
			parts: before.parts?.map((part) => ({ ...part, end: "19:40" })),
		}),
	).toBe(true);
	expect(
		changedNotificationEvent(
			{ ...before, cancelled: true },
			{ ...before, cancelled: true },
		),
	).toBe(false);
});

test("coalesced creation alerts retain separate invitation audiences in the same program", () => {
	const first = event("sam-only", { eligiblePersonIds: ["sam"] });
	const second = event("mila-only", { eligiblePersonIds: ["mila"] });
	expect(
		createdNotificationEvents(
			[],
			[first, second, event("sam-again", { eligiblePersonIds: ["sam"] })],
			now,
		).map((item) => item.id),
	).toEqual(["sam-only", "mila-only"]);
});
