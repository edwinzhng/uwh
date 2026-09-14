import { describe, expect, test } from "bun:test";
import type { ClubEvent, Member } from "../src/domain/app-types";
import { attendanceReportRow } from "../src/domain/attendance-report";

const player: Member = {
	id: "one",
	name: "One",
	programs: ["club"],
	position: "Player",
	rating: 3,
	registration: "approved",
	goal: "",
	steps: 0,
};
const event = (id: string, change: Partial<ClubEvent> = {}): ClubEvent => ({
	id,
	title: id,
	date: "2026-09-01",
	start: "18:00",
	end: "19:00",
	venue: "Pool",
	program: "club",
	kind: "training",
	signup: "open",
	capacity: 20,
	description: "",
	cancelled: false,
	...change,
});
describe("coach attendance reports", () => {
	test("unmarked is distinct from absent; late counts as attended", () => {
		const result = attendanceReportRow(
			player,
			[event("a"), event("b"), event("c"), event("d")],
			[
				{
					eventId: "a",
					personId: "one",
					response: "going",
					attendance: "present",
				},
				{
					eventId: "b",
					personId: "one",
					response: "going",
					attendance: "late",
				},
				{
					eventId: "c",
					personId: "one",
					response: "going",
					attendance: "absent",
				},
			],
			[
				{ eventId: "b", personId: "one", kind: "addition" },
				{ eventId: "c", personId: "one", kind: "cancellation" },
			],
			Date.parse("2026-10-01"),
		);
		expect(result.recorded).toBe(3);
		expect(result.total).toBe(4);
		expect(result.attended).toBe(67);
		expect(result.onTime).toBe(50);
		expect(result.additions).toBe(1);
		expect(result.cancellations).toBe(1);
		expect(result.cells.at(-1)?.attendance).toBe("unmarked");
		expect(result.points).toEqual([{ date: "2026-09-01", value: 67 }]);
	});
	test("eligibility, cancellation and completion control report denominators", () => {
		const result = attendanceReportRow(
			player,
			[
				event("a", { eligiblePersonIds: ["other"] }),
				event("b", { cancelled: true }),
				event("c", { kind: "social" }),
				event("d", { date: "2099-09-01" }),
			],
			[],
			[],
			Date.parse("2026-10-01"),
		);
		expect(result.total).toBe(0);
		expect(result.recorded).toBe(0);
		expect(result.attended).toBeUndefined();
		expect(result.onTime).toBeUndefined();
		expect(result.points).toEqual([]);
	});
	test("both same-day practices count independently and absent is zero percent", () => {
		const result = attendanceReportRow(
			player,
			[event("a"), event("b")],
			[
				{
					eventId: "a",
					personId: "one",
					response: "going",
					attendance: "absent",
				},
				{
					eventId: "b",
					personId: "one",
					response: "going",
					attendance: "absent",
				},
			],
			[],
			Date.parse("2026-10-01"),
		);
		expect(result.total).toBe(2);
		expect(result.attended).toBe(0);
		expect(result.onTime).toBeUndefined();
		expect(result.points.at(0)?.value).toBe(0);
	});
});
