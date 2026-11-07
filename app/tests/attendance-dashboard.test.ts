import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent, EventResponse, Member } from "../src/domain/app-types";
import {
	attendanceDashboard,
	attendanceDashboardRows,
	attendanceDay,
	dashboardRow,
} from "../src/domain/attendance-dashboard";
import { attendanceSummary } from "../src/domain/attendance-summary";

const member: Member = {
	id: "player",
	name: "Player",
	programs: ["club"],
	position: "Player",
	rating: 0,
	registration: "approved",
	goal: "",
	steps: 0,
};
const events: ClubEvent[] = Array.from({ length: 8 }, (_, index) => ({
	id: `practice-${index}`,
	title: "Monday practice",
	date: `2026-09-${String(7 + index).padStart(2, "0")}`,
	start: "18:00",
	end: "19:00",
	program: "club",
	kind: "hockey",
	venue: "Pool",
	signup: "closed",
	description: "",
	cancelled: false,
	seasonId: "2026-2027",
}));
const now = Date.parse("2026-10-01T00:00:00Z");
const responses: EventResponse[] = events.slice(0, 4).map((event) => ({
	eventId: event.id,
	personId: member.id,
	response: "going",
	attendance: "present",
}));
test("four recorded attendances across eight available sessions is 50%, not 100%, and shows a real decline", (): void => {
	const row = dashboardRow(member, events, responses, now);
	expect(row).toMatchObject({
		attended: 50,
		total: 8,
		attendedCount: 4,
		recorded: 8,
		unmarked: 0,
		previous: 100,
		recent: 0,
		trend: -100,
		window: 4,
	});
	expect(row.points).toEqual([{ date: "2026-09-01", value: 50 }]);
	expect(
		attendanceSummary(
			{ ...initialAppData, events, responses },
			member,
			"2026-2027",
			now,
		).attended,
	).toBe(50);
});
test("membership and snapshots scope available sessions even for legacy events without RSVP rules", (): void => {
	const baseline = events.at(0);
	if (!baseline) throw new Error("Missing event");
	const row = dashboardRow(
		member,
		[
			baseline,
			{ ...baseline, id: "other-program", program: "youth" },
			{ ...baseline, id: "restricted", eligiblePersonIds: ["other"] },
			{ ...baseline, id: "cancelled", cancelled: true },
			{ ...baseline, id: "future", date: "2099-09-01" },
		],
		[],
		now,
	);
	expect(row.total).toBe(1);
	expect(row.attended).toBe(0);
	expect(row.recorded).toBe(1);
	expect(row.trend).toBeUndefined();
	expect(dashboardRow(member, [], [], now).attended).toBeUndefined();
	expect(attendanceDay(baseline)).toBe(1);
});
test("dashboard totals and monthly series are weighted by available sessions; sorting and filters use the whole roster", (): void => {
	const high = dashboardRow(
		{ ...member, id: "high", name: "High" },
		events.slice(0, 2),
		responses.map((response) => ({ ...response, personId: "high" })),
		now,
	);
	const low = dashboardRow(
		{ ...member, id: "low", name: "Low" },
		events,
		[],
		now,
	);
	const result = attendanceDashboard([high, low]);
	expect(result).toMatchObject({
		attended: 2,
		available: 10,
		recorded: 10,
		rate: 20,
		coverage: 100,
		players: 2,
	});
	expect(result.points).toEqual([{ date: "2026-09-01", value: 20 }]);
	expect(
		attendanceDashboardRows([low, high], "highest", "all", "").at(0)?.id,
	).toBe("high");
	expect(
		attendanceDashboardRows([low, high], "lowest", "all", "").at(0)?.id,
	).toBe("low");
	expect(
		attendanceDashboardRows([low, high], "highest", "high", "").map(
			(row) => row.id,
		),
	).toEqual(["high"]);
	expect(
		attendanceDashboardRows([low, high], "highest", "low", "").map(
			(row) => row.id,
		),
	).toEqual(["low"]);
	expect(
		attendanceDashboardRows([low, high], "name", "all", "hi").map(
			(row) => row.id,
		),
	).toEqual(["high"]);
});

test("saved eligibility preserves attendance history after leaving a program", (): void => {
	const saved = events.map((event) => ({
		...event,
		eligiblePersonIds: [member.id],
	}));
	const former = { ...member, programs: [] };
	expect(dashboardRow(former, saved, responses, now)).toMatchObject({
		total: 8,
		attended: 50,
	});
	expect(dashboardRow(former, events, responses, now).total).toBe(0);
	expect(
		dashboardRow(member, saved, responses, Date.parse("2026-09-01")).total,
	).toBe(0);
});
