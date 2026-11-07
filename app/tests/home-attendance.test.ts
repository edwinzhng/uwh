import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import { formatPoolTime, homeAttendance } from "../src/domain/home-attendance";

test("pool time displays hours and minutes without decimal rounding", (): void => {
	expect(formatPoolTime(1090)).toBe("18h 10m");
	expect(formatPoolTime(45)).toBe("0h 45m");
	expect(formatPoolTime(120)).toBe("2h");
	expect(formatPoolTime(0)).toBe("0h");
});

const member = initialAppData.members.find((entry) => entry.id === "sam");
if (!member) throw new Error("Missing member");
const event: ClubEvent = {
	id: "practice",
	title: "Practice",
	date: "2026-09-01",
	start: "19:00",
	end: "20:30",
	venue: "Pool",
	kind: "training",
	program: "club",
	signup: "closed",
	cancelled: false,
	description: "",
	seasonId: "2026-2027",
	parts: [
		{
			id: "training",
			title: "Training",
			kind: "training",
			start: "19:00",
			end: "19:45",
		},
		{
			id: "hockey",
			title: "Hockey",
			kind: "hockey",
			start: "19:45",
			end: "20:30",
		},
	],
};
const response: EventResponse = {
	eventId: event.id,
	personId: member.id,
	response: "going",
	attendance: "unmarked",
};
const now = Date.parse("2026-09-08T18:00:00Z");

test("counts one practice and only scheduled time for attended parts", (): void => {
	const data = {
		...initialAppData,
		events: [event],
		responses: [
			{
				...response,
				partAttendance: [
					{ partId: "training", attendance: "late" as const },
					{ partId: "hockey", attendance: "absent" as const },
				],
			},
		],
	};
	expect(homeAttendance(data, member, "2026-2027", now)).toEqual({
		practices: 1,
		minutes: 45,
	});
	expect(
		homeAttendance(
			{ ...data, responses: [response] },
			member,
			"2026-2027",
			now,
		),
	).toEqual({ practices: 1, minutes: 90 });
	expect(
		homeAttendance(
			{ ...data, responses: [{ ...response, partIds: ["hockey"] }] },
			member,
			"2026-2027",
			now,
		),
	).toEqual({ practices: 1, minutes: 45 });
});

test("excludes future, cancelled, other-season, ineligible, non-practice and absent events", (): void => {
	const events: ClubEvent[] = [
		event,
		{ ...event, id: "future", date: "2026-10-01" },
		{ ...event, id: "cancelled", cancelled: true },
		{ ...event, id: "season", seasonId: "other" },
		{ ...event, id: "ineligible", eligiblePersonIds: ["someone-else"] },
		{ ...event, id: "tournament", kind: "tournament" },
	];
	const responses = events.map((entry) => ({
		...response,
		eventId: entry.id,
		attendance: "absent" as const,
	}));
	expect(
		homeAttendance(
			{ ...initialAppData, events, responses },
			member,
			"2026-2027",
			now,
		),
	).toEqual({ practices: 0, minutes: 0 });
});
