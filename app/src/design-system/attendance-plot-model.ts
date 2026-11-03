import type { AttendancePoint } from "../domain/attendance-summary";
import { corners } from "./tokens";

export type RecordedAttendancePoint = Omit<AttendancePoint, "unmarked">;
export const attendanceStackOrder = ["onTime", "late", "absent"] as const;
export type AttendanceSegment = (typeof attendanceStackOrder)[number];

export const attendanceSegmentRadius = (
	point: RecordedAttendancePoint,
	segment: AttendanceSegment,
	width: number,
	height: number,
): number =>
	attendanceStackOrder.reduce<AttendanceSegment | undefined>(
		(top, key) => (point[key] > 0 ? key : top),
		undefined,
	) === segment
		? Math.max(0, Math.min(corners.item, width / 2, height / 2))
		: 0;

export const attendanceBarPath = (
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): string => {
	if (width <= 0 || height <= 0) return "";
	const right = x + width;
	const bottom = y + height;
	if (radius <= 0) return `M ${x} ${y} H ${right} V ${bottom} H ${x} Z`;
	return `M ${x} ${bottom} V ${y + radius} Q ${x} ${y} ${x + radius} ${y} H ${right - radius} Q ${right} ${y} ${right} ${y + radius} V ${bottom} Z`;
};

export const attendanceStackSegments = (
	point: RecordedAttendancePoint,
	maximum: number,
	plotHeight: number,
	width: number,
): { key: AttendanceSegment; y: number; height: number; radius: number }[] =>
	attendanceStackOrder.map((key, index) => {
		const height = maximum > 0 ? (point[key] / maximum) * plotHeight : 0;
		const total = attendanceStackOrder
			.slice(0, index + 1)
			.reduce((sum, segment) => sum + point[segment], 0);
		return {
			key,
			y: plotHeight - (maximum > 0 ? (total / maximum) * plotHeight : 0),
			height,
			radius: attendanceSegmentRadius(point, key, width, height),
		};
	});

export const recordedAttendance = (point: RecordedAttendancePoint): number =>
	point.onTime + point.late + point.absent;

export const attendanceChartPoints = (
	points: AttendancePoint[],
): RecordedAttendancePoint[] =>
	points
		.filter((point) => recordedAttendance(point) > 0)
		.map((point) => ({
			label: point.label,
			onTime: point.onTime,
			late: point.late,
			absent: point.absent,
		}));

export const attendanceChartLabel = (
	points: RecordedAttendancePoint[],
): string =>
	points.length
		? points
				.map(
					(point) =>
						`${point.label}: ${point.onTime} on time, ${point.late} late, ${point.absent} no-show`,
				)
				.join(". ")
		: "No recorded attendance";
