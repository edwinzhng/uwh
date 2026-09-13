import { canRegister } from "./app-rules";
import type { ClubEvent, EventResponse, Member } from "./app-types";
import type { Attendance } from "./club";
import { effectiveAttendance } from "./effective-attendance";
import { clubTimestamp } from "./event-time";

export type AttendanceFlag = "addition" | "cancellation";
export type ReportFlag = {
	eventId: string;
	personId: string;
	kind: AttendanceFlag;
};
export type AttendanceReportRow = {
	id: string;
	name: string;
	attended?: number;
	onTime?: number;
	recorded: number;
	total: number;
	additions: number;
	cancellations: number;
	cells: { eventId: string; attendance?: Attendance; flag?: AttendanceFlag }[];
	points: { date: string; value: number }[];
};

export const attendanceReportRow = (
	member: Member,
	events: ClubEvent[],
	responses: EventResponse[],
	flags: ReportFlag[],
	now: number,
): AttendanceReportRow => {
	const statusByEvent = new Map(
		responses
			.filter((row) => row.personId === member.id)
			.map((row) => [row.eventId, row]),
	);
	const flagsByEvent = new Map(
		flags
			.filter((row) => row.personId === member.id)
			.map((row) => [row.eventId, row.kind]),
	);
	const eligible = events.filter(
		(event) =>
			!event.cancelled &&
			event.kind !== "social" &&
			canRegister(member, event) &&
			clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <=
				now,
	);
	const eligibleIds = new Set(eligible.map((event) => event.id));
	const cells = events.map((event) => ({
		eventId: event.id,
		attendance: eligibleIds.has(event.id)
			? effectiveAttendance(event, statusByEvent.get(event.id))
			: undefined,
		flag: flagsByEvent.get(event.id),
	}));
	const counted = cells.filter(
		(cell) => cell.attendance !== undefined && cell.attendance !== "unmarked",
	);
	const present = counted.filter(
		(cell) => cell.attendance === "present",
	).length;
	const attended =
		present + counted.filter((cell) => cell.attendance === "late").length;
	const months = [...new Set(eligible.map((event) => event.date.slice(0, 7)))];
	return {
		id: member.id,
		name: member.name,
		recorded: counted.length,
		total: eligible.length,
		attended: counted.length
			? Math.round((attended / counted.length) * 100)
			: undefined,
		onTime: attended ? Math.round((present / attended) * 100) : undefined,
		additions: cells.filter((cell) => cell.flag === "addition").length,
		cancellations: cells.filter((cell) => cell.flag === "cancellation").length,
		cells,
		points: months.flatMap((month) => {
			const monthCells = eligible
				.filter((event) => event.date.startsWith(month))
				.map((event) => effectiveAttendance(event, statusByEvent.get(event.id)))
				.filter((status) => status !== "unmarked");
			return monthCells.length
				? [
						{
							date: `${month}-01`,
							value: Math.round(
								(monthCells.filter(
									(status) => status === "present" || status === "late",
								).length /
									monthCells.length) *
									100,
							),
						},
					]
				: [];
		}),
	};
};
