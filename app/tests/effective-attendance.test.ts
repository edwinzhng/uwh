import { expect, test } from "bun:test";
import { initialAppData } from "../src/demo/app-data";
import type { ClubEvent, EventResponse } from "../src/domain/app-types";
import { attendanceReportRow } from "../src/domain/attendance-report";
import { attendanceSummary } from "../src/domain/attendance-summary";
import { effectiveAttendance } from "../src/domain/effective-attendance";

const practice = initialAppData.events.find((event) => event.id === "club-thu");
const player = initialAppData.members.at(0);
if (!practice || !player) throw new Error("Missing fixture");
const event: ClubEvent = { ...practice, date: "2026-09-01" };
const going: EventResponse = {
	eventId: event.id,
	personId: player.id,
	response: "going",
	attendance: "unmarked",
};

test("Going defaults to Here without turning other responses into attendance", (): void => {
	expect(effectiveAttendance(event, going)).toBe("present");
	for (const response of ["waiting", "unavailable", "unanswered"] as const)
		expect(effectiveAttendance(event, { ...going, response })).toBe("unmarked");
	expect(effectiveAttendance({ ...event, cancelled: true }, going)).toBe(
		"unmarked",
	);
	expect(going.attendance).toBe("unmarked");
	for (const attendance of ["late", "absent", "present"] as const)
		expect(effectiveAttendance(event, { ...going, attendance })).toBe(
			attendance,
		);
});

test("part defaults respect registration selection and explicit coach marks", (): void => {
	const hockeyOnly = { ...going, partIds: ["hockey"] };
	expect(effectiveAttendance(event, hockeyOnly, "training")).toBe("unmarked");
	expect(effectiveAttendance(event, hockeyOnly, "hockey")).toBe("present");
	const late: EventResponse = {
		...going,
		partAttendance: [{ partId: "training", attendance: "late" }],
	};
	expect(effectiveAttendance(event, late, "training")).toBe("late");
	expect(effectiveAttendance(event, late, "hockey")).toBe("present");
	expect(effectiveAttendance(event, late)).toBe("late");
	expect(
		effectiveAttendance(event, {
			...hockeyOnly,
			partAttendance: [{ partId: "hockey", attendance: "absent" }],
		}),
	).toBe("absent");
});

test("member and coach reports agree on default attendance and exclude future practices", (): void => {
	const future = { ...event, id: "future", date: "2099-09-01" };
	const data = {
		...initialAppData,
		events: [event, future],
		responses: [going, { ...going, eventId: future.id }],
	};
	const now = Date.parse("2026-09-08T18:00:00Z");
	const summary = attendanceSummary(data, player, "2026-2027", now);
	const report = attendanceReportRow(
		player,
		data.events,
		data.responses,
		[],
		now,
	);
	expect(summary).toMatchObject({
		recorded: 1,
		total: 1,
		attended: 100,
		onTime: 100,
	});
	expect(report).toMatchObject({
		recorded: 1,
		total: 1,
		attended: 100,
		onTime: 100,
	});
	expect(
		report.cells.find((cell) => cell.eventId === future.id)?.attendance,
	).toBeUndefined();
});
