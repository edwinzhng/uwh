import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { AppData, ClubEvent } from "../src/domain/app-types";
import { attendanceSummary } from "../src/domain/attendance-summary";

const member = initialAppData.members.find((entry) => entry.id === "sam");
if (!member) throw new Error("Missing member");
const event: ClubEvent = {
	id: "base",
	title: "Practice",
	date: "2026-09-01",
	start: "19:00",
	end: "20:00",
	venue: "Pool",
	kind: "training",
	program: "club",
	signup: "closed",
	capacity: 20,
	cancelled: false,
	description: "",
	seasonId: "2026-2027",
};
const now = Date.parse("2026-09-08T18:00:00Z");

test("attendance percentages exclude unmarked records, future events, socials and other seasons", (): void => {
	const data: AppData = {
		...initialAppData,
		events: ["present", "late", "absent", "unmarked"]
			.map((id) => ({ ...event, id }))
			.concat([
				{ ...event, id: "future", date: "2026-10-01" },
				{ ...event, id: "cancelled", cancelled: true },
				{ ...event, id: "social", kind: "social" },
				{ ...event, id: "other-season", seasonId: "2025-2026" },
				{ ...event, id: "restricted", eligiblePersonIds: ["alex"] },
			]),
		responses: ["present", "late", "absent"].map((id) => ({
			eventId: id,
			personId: member.id,
			response: "going",
			attendance:
				id === "present" ? "present" : id === "late" ? "late" : "absent",
		})),
	};
	const summary = attendanceSummary(data, member, "2026-2027", now);
	expect(summary).toMatchObject({
		attended: 67,
		onTime: 50,
		total: 4,
		recorded: 3,
	});
	expect(summary.points).toEqual([
		{ label: "Sep", onTime: 1, late: 1, absent: 1, unmarked: 1 },
	]);
});

test("no recorded attendance shows unknown percentages rather than false zeros", (): void => {
	const summary = attendanceSummary(
		{ ...initialAppData, events: [event], responses: [] },
		member,
		"2026-2027",
		now,
	);
	expect(summary.attended).toBeUndefined();
	expect(summary.onTime).toBeUndefined();
	expect(summary.recorded).toBe(0);
	expect(summary.total).toBe(1);
});
