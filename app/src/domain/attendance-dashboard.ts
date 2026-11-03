import type { ClubEvent, EventResponse, Member } from "./app-types";
import { attendancePercent } from "./attendance-metrics";
import { attendanceReportRow } from "./attendance-report";

export type AttendanceSort = "highest" | "lowest" | "declining" | "name";
export type AttendanceBand = "all" | "high" | "low" | "declining";
export type AttendanceDashboardRow = Omit<
	ReturnType<typeof attendanceReportRow>,
	"cells"
> & {
	trend?: number;
	window: number;
	recent?: number;
	previous?: number;
	unmarked: number;
	monthly: { date: string; available: number; attended: number }[];
};
export type AttendanceDashboard = {
	rows: AttendanceDashboardRow[];
	available: number;
	attended: number;
	recorded: number;
	rate?: number;
	coverage?: number;
	declining: number;
	players: number;
	points: { date: string; value: number }[];
};
export const attendanceDay = (event: ClubEvent): number =>
	new Date(`${event.date}T12:00:00Z`).getUTCDay();
export const dashboardRow = (
	member: Member,
	events: ClubEvent[],
	responses: EventResponse[],
	now: number,
): AttendanceDashboardRow => {
	const ordered = events
		.slice()
		.sort(
			(a, b) =>
				a.date.localeCompare(b.date) ||
				a.start.localeCompare(b.start) ||
				a.id.localeCompare(b.id),
		);
	const { cells, ...row } = attendanceReportRow(
		member,
		ordered,
		responses,
		[],
		now,
	);
	const eligible = cells.filter((cell) => cell.attendance !== undefined);
	const window = Math.min(4, Math.floor(eligible.length / 2));
	const rate = (items: typeof cells): number | undefined =>
		attendancePercent(
			items.filter(
				(item) => item.attendance === "present" || item.attendance === "late",
			).length,
			items.length,
		);
	const recent = window >= 2 ? rate(eligible.slice(-window)) : undefined;
	const previous =
		window >= 2 ? rate(eligible.slice(-window * 2, -window)) : undefined;
	const monthly = row.points.map((point) => {
		const ids = new Set(
			ordered
				.filter((event) => event.date.startsWith(point.date.slice(0, 7)))
				.map((event) => event.id),
		);
		const month = eligible.filter((cell) => ids.has(cell.eventId));
		return {
			date: point.date,
			available: month.length,
			attended: month.filter(
				(cell) => cell.attendance === "present" || cell.attendance === "late",
			).length,
		};
	});
	return {
		...row,
		monthly,
		unmarked: row.total - row.recorded,
		window,
		recent,
		previous,
		trend:
			recent !== undefined && previous !== undefined
				? recent - previous
				: undefined,
	};
};
export const attendanceDashboard = (
	rows: AttendanceDashboardRow[],
): AttendanceDashboard => {
	const available = rows.reduce((sum, row) => sum + row.total, 0);
	const attended = rows.reduce((sum, row) => sum + row.attendedCount, 0);
	const recorded = rows.reduce((sum, row) => sum + row.recorded, 0);
	const dates = [
		...new Set(rows.flatMap((row) => row.points.map((point) => point.date))),
	].sort();
	return {
		rows,
		available,
		attended,
		recorded,
		rate: attendancePercent(attended, available),
		coverage: attendancePercent(recorded, available),
		declining: rows.filter((row) => row.trend !== undefined && row.trend < 0)
			.length,
		players: rows.filter((row) => row.total > 0).length,
		points: dates.map((date) => {
			const months = rows.flatMap((row) =>
				row.monthly.filter((point) => point.date === date),
			);
			return {
				date,
				value:
					attendancePercent(
						months.reduce((sum, point) => sum + point.attended, 0),
						months.reduce((sum, point) => sum + point.available, 0),
					) ?? 0,
			};
		}),
	};
};
export const attendanceDashboardRows = (
	rows: AttendanceDashboardRow[],
	sort: AttendanceSort,
	band: AttendanceBand,
	search: string,
): AttendanceDashboardRow[] =>
	rows
		.filter(
			(row) =>
				row.name.toLowerCase().includes(search.trim().toLowerCase()) &&
				(band === "all" ||
					(band === "high" && (row.attended ?? -1) >= 80) ||
					(band === "low" && row.attended !== undefined && row.attended < 50) ||
					(band === "declining" && row.trend !== undefined && row.trend < 0)),
		)
		.sort((a, b) => {
			const key = sort === "declining" ? "trend" : "attended";
			const left = a[key];
			const right = b[key];
			return sort === "name"
				? a.name.localeCompare(b.name)
				: left === undefined && right !== undefined
					? 1
					: right === undefined && left !== undefined
						? -1
						: left !== undefined && right !== undefined && left !== right
							? (left - right) * (sort === "highest" ? -1 : 1)
							: a.name.localeCompare(b.name);
		});
