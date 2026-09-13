import { describe, expect, test } from "bun:test";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import {
	enrollmentApplies,
	type SessionSeries,
	seriesHasSpace,
	syncSeriesResponses,
} from "../src/domain/session-series";

const series: SessionSeries = {
	id: "mondays",
	seriesIds: ["mondays"],
	title: "Monday training",
	capacity: 1,
	waitlist: true,
	enrollments: [
		{
			personId: "a",
			start: "2026-09-14",
			end: "2026-12-01",
			state: "committed",
		},
	],
};
const event = (id: string, date: string): ClubEvent => ({
	id,
	date,
	title: "Monday training",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	program: "club",
	kind: "hockey",
	signup: "open",
	description: "",
	cancelled: false,
	seriesId: "mondays",
});
describe("committed session series", () => {
	test("effective dates include joining and exclude leaving", () => {
		const enrollment = series.enrollments.at(0);
		if (!enrollment) throw new Error("Fixture missing");
		expect(enrollmentApplies(enrollment, "2026-09-07")).toBe(false);
		expect(enrollmentApplies(enrollment, "2026-09-14")).toBe(true);
		expect(enrollmentApplies(enrollment, "2026-12-01")).toBe(false);
	});
	test("capacity respects overlapping terms, without counting waitlist or disjoint commitments", () => {
		expect(seriesHasSpace(series, "2026-10-01")).toBe(false);
		expect(seriesHasSpace(series, "2026-12-01")).toBe(true);
		expect(seriesHasSpace(series, "2026-09-01", "2026-09-14")).toBe(true);
		expect(
			seriesHasSpace(
				{
					...series,
					enrollments: series.enrollments.map((entry) => ({
						...entry,
						state: "waiting",
					})),
				},
				"2026-10-01",
			),
		).toBe(true);
	});
	test("enrollment supplies expected participation and leaves actual attendance unmarked", () => {
		const responses = syncSeriesResponses(
			series,
			[event("one", "2026-09-14"), event("two", "2026-09-21")],
			[],
			"2026-09-13",
		);
		expect(responses).toHaveLength(2);
		expect(
			responses.every(
				(entry) =>
					entry.seriesExpected &&
					entry.response === "going" &&
					entry.attendance === "unmarked",
			),
		).toBe(true);
	});
	test("future generation preserves individual absences and actual historical attendance", () => {
		const previous: EventResponse[] = [
			{
				eventId: "one",
				personId: "a",
				seriesExpected: true,
				response: "unavailable",
				attendance: "unmarked",
			},
			{
				eventId: "past",
				personId: "a",
				seriesExpected: true,
				response: "going",
				attendance: "present",
			},
		];
		const next = syncSeriesResponses(
			series,
			[
				event("past", "2026-09-07"),
				event("one", "2026-09-14"),
				event("two", "2026-09-21"),
			],
			previous,
			"2026-09-13",
		);
		expect(next.find((entry) => entry.eventId === "one")?.response).toBe(
			"unavailable",
		);
		expect(next.find((entry) => entry.eventId === "past")?.attendance).toBe(
			"present",
		);
		expect(next.find((entry) => entry.eventId === "two")?.seriesExpected).toBe(
			true,
		);
	});
	test("ending enrollment removes future expectation without erasing previous records or guests", () => {
		const events = [event("past", "2026-09-14"), event("future", "2026-09-21")];
		const enrolled = syncSeriesResponses(
			series,
			events,
			[
				{
					eventId: "future",
					personId: "guest",
					response: "going",
					attendance: "unmarked",
				},
			],
			"2026-09-13",
		);
		const ended = {
			...series,
			enrollments: series.enrollments.map((entry) => ({
				...entry,
				end: "2026-09-21",
			})),
		};
		const next = syncSeriesResponses(ended, events, enrolled, "2026-09-20");
		expect(next.find((entry) => entry.eventId === "past")?.seriesExpected).toBe(
			true,
		);
		expect(
			next.find((entry) => entry.eventId === "future" && entry.personId === "a")
				?.response,
		).toBe("unanswered");
		expect(next.find((entry) => entry.personId === "guest")?.response).toBe(
			"going",
		);
	});
	test("single-session absence never releases the committed term place", () => {
		expect(seriesHasSpace(series, "2026-09-14", "2026-09-15")).toBe(false);
	});
});

test("ending a term today preserves a session completed earlier today", () => {
	const session = event("completed", "2026-09-14");
	const previous: EventResponse[] = [
		{
			eventId: session.id,
			personId: "a",
			seriesExpected: true,
			response: "going",
			attendance: "present",
		},
	];
	const ended = {
		...series,
		enrollments: series.enrollments.map((entry) => ({
			...entry,
			end: session.date,
		})),
	};
	expect(
		syncSeriesResponses(
			ended,
			[session],
			previous,
			session.date,
			clubTimestamp(session.date, "21:00"),
		),
	).toEqual(previous);
});
test("narrowed eligibility removes expectation and cannot resurrect an excluded player", () => {
	const session = {
		...event("restricted", "2026-09-14"),
		eligiblePersonIds: ["b"],
	};
	const previous: EventResponse[] = [
		{
			eventId: session.id,
			personId: "a",
			seriesExpected: true,
			response: "unavailable",
			attendance: "unmarked",
		},
	];
	expect(
		syncSeriesResponses(series, [session], previous, "2026-09-13").at(0)
			?.seriesExpected,
	).toBeUndefined();
	expect(syncSeriesResponses(series, [session], [], "2026-09-13")).toEqual([]);
});
