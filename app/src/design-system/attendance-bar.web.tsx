import type { ReactElement } from "react";
import {
	type AttendanceSegment,
	attendanceBarPath,
	attendanceSegmentRadius,
	type RecordedAttendancePoint,
} from "./attendance-plot-model";

export const AttendanceBar = ({
	point,
	segment,
	x,
	y,
	width,
	height,
	fill,
}: {
	point?: RecordedAttendancePoint;
	segment: AttendanceSegment;
	x: number;
	y: number;
	width: number;
	height: number;
	fill?: string;
}): ReactElement => (
	<path
		d={attendanceBarPath(
			x,
			y,
			width,
			height,
			point ? attendanceSegmentRadius(point, segment, width, height) : 0,
		)}
		fill={fill}
	/>
);
