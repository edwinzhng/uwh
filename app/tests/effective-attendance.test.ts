import { expect, test } from "bun:test";
import { initialAppData, primaryAccount } from "../src/demo/app-data";
import { reduceApp } from "../src/domain/app-reducer";
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

test("late additions become Here for the selected part without changing the original RSVP or other marks", (): void => {
	const response: EventResponse = {
		...going,
		response: "unavailable",
		partIds: ["hockey"],
		partAttendance: [{ partId: "hockey", attendance: "absent" }],
	};
	const data = { ...initialAppData, events: [event], responses: [response] };
	const action = {
		type: "attendance" as const,
		eventId: event.id,
		personId: player.id,
		attendance: "present" as const,
		partId: "training",
		lateAddition: true,
	};
	const next = reduceApp(data, primaryAccount, action);
	const marked = next.responses.at(0);
	expect(marked?.response).toBe("unavailable");
	expect(marked?.partIds).toEqual(["hockey", "training"]);
	expect(effectiveAttendance(event, marked, "training")).toBe("present");
	expect(effectiveAttendance(event, marked, "hockey")).toBe("absent");
	expect(reduceApp(next, primaryAccount, action).responses).toEqual(
		next.responses,
	);
	expect(() =>
		reduceApp(
			data,
			{ ...primaryAccount, admin: false, coachPrograms: [] },
			action,
		),
	).toThrow();
});

test("Going defaults to Here and unanswered attendance becomes absent at the start", (): void => {
	expect(effectiveAttendance(event, going)).toBe("present");
	for (const response of ["waiting", "unavailable"] as const)
		expect(effectiveAttendance(event, { ...going, response })).toBe("unmarked");
	expect(effectiveAttendance({ ...event, cancelled: true }, going)).toBe(
		"unmarked",
	);
	const start = Date.parse("2026-09-01T00:00:00Z");
	const practice = {
		...event,
		date: "2026-08-31",
		start: "18:00",
		timeZone: "America/Edmonton",
		closesAt: start - 1800000,
	};
	expect(effectiveAttendance(practice, undefined, undefined, start - 1)).toBe(
		"unmarked",
	);
	expect(effectiveAttendance(practice, undefined, undefined, start)).toBe(
		"absent",
	);
	expect(
		effectiveAttendance(
			practice,
			{ ...going, response: "unanswered", attendance: "present" },
			undefined,
			start,
		),
	).toBe("present");
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
