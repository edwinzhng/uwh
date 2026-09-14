import { canRegister } from "./app-rules";
import type { AppData, Member } from "./app-types";
import { effectiveAttendance } from "./effective-attendance";
import { clubTimestamp } from "./event-time";
import { groupBy } from "./group-by";
import { defaultSeasonId } from "./seasons";

export type AttendancePoint = {
	label: string;
	onTime: number;
	late: number;
	absent: number;
	unmarked: number;
};
export const attendanceSummary = (
	data: AppData,
	member: Member,
	seasonId: string,
	now: number,
): {
	points: AttendancePoint[];
	attended?: number;
	onTime?: number;
	recorded: number;
	total: number;
	records: {
		id: string;
		title: string;
		date: string;
		attendance: "present" | "late" | "absent" | "unmarked";
	}[];
} => {
	const responses = new Map(
		data.responses
			.filter((entry) => entry.personId === member.id)
			.map((entry) => [entry.eventId, entry]),
	);
	const records = data.events
		.filter(
			(event) =>
				(event.seasonId ?? defaultSeasonId) === seasonId &&
				!event.cancelled &&
				event.kind !== "social" &&
				event.kind !== "meeting" &&
				canRegister(member, event) &&
				clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <=
					now,
		)
		.toSorted((a, b) => a.date.localeCompare(b.date))
		.map((event) => ({
			id: event.id,
			title: event.title,
			date: event.date,
			attendance: effectiveAttendance(event, responses.get(event.id)),
		}));
	const recorded = records.filter(
		(record) => record.attendance !== "unmarked",
	).length;
	const onTime = records.filter(
		(record) => record.attendance === "present",
	).length;
	const attended =
		onTime + records.filter((record) => record.attendance === "late").length;
	const byMonth = groupBy(records, (record) => record.date.slice(0, 7));
	const months = [...byMonth.keys()];
	return {
		attended: recorded ? Math.round((attended / recorded) * 100) : undefined,
		onTime: attended ? Math.round((onTime / attended) * 100) : undefined,
		recorded,
		total: records.length,
		records,
		points: months.map((month) => {
			const entries = byMonth.get(month) ?? [];
			return {
				label: new Intl.DateTimeFormat("en", {
					month: "short",
					year: months.length > 12 ? "2-digit" : undefined,
					timeZone: "UTC",
				}).format(new Date(`${month}-01T12:00:00Z`)),
				onTime: entries.filter((entry) => entry.attendance === "present")
					.length,
				late: entries.filter((entry) => entry.attendance === "late").length,
				absent: entries.filter((entry) => entry.attendance === "absent").length,
				unmarked: entries.filter((entry) => entry.attendance === "unmarked")
					.length,
			};
		}),
	};
};
