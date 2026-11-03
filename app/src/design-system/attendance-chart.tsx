import type { ReactElement } from "react";
import { View } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import type { AttendancePoint } from "../domain/attendance-summary";
import {
	attendanceBarPath,
	attendanceChartLabel,
	attendanceChartPoints,
	attendanceStackSegments,
	type RecordedAttendancePoint,
	recordedAttendance,
} from "./attendance-plot-model";
import { chartColors } from "./rainbow-palette";
import { Row } from "./row";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

export const AttendanceChart = ({
	data,
}: {
	data: AttendancePoint[];
}): ReactElement => {
	const theme = useTheme();
	const points = attendanceChartPoints(data);
	const max = Math.max(1, ...points.map(recordedAttendance));
	const width = geometry.messageImage;
	const height = geometry.chart - space.xl;
	const slot = width / Math.max(1, points.length);
	return (
		<View
			accessibilityRole="image"
			accessibilityLabel={attendanceChartLabel(points)}
		>
			<Svg
				width="100%"
				height={geometry.chart}
				viewBox={`0 0 ${width} ${geometry.chart}`}
			>
				{[0, 0.5, 1].map((fraction) => (
					<Line
						key={fraction}
						x1={0}
						x2={width}
						y1={height * fraction}
						y2={height * fraction}
						stroke={theme.border}
						strokeLinecap="round"
					/>
				))}
				{points.map((point, index) => (
					<ReactChartColumn
						key={point.label}
						point={point}
						x={index * slot}
						slot={slot}
						height={height}
						max={max}
					/>
				))}
			</Svg>
			<Row wrap gap="sm" justify="center">
				{[
					{ label: "On time", color: chartColors.green },
					{ label: "Late", color: chartColors.amber },
					{ label: "No-show", color: chartColors.red },
				].map((item) => (
					<Row key={item.label} gap="xxs">
						<View
							style={{
								width: space.xs,
								height: space.xs,
								borderRadius: corners.item,
								backgroundColor: item.color,
							}}
						/>
						<Text variant="caption" tone="secondary">
							{item.label}
						</Text>
					</Row>
				))}
			</Row>
		</View>
	);
};

const ReactChartColumn = ({
	point,
	x,
	slot,
	height,
	max,
}: {
	point: RecordedAttendancePoint;
	x: number;
	slot: number;
	height: number;
	max: number;
}): ReactElement => {
	const theme = useTheme();
	const barWidth = Math.min(geometry.chartBar, Math.max(1, slot - space.xs));
	const parts = attendanceStackSegments(point, max, height, barWidth);
	const colors = {
		onTime: chartColors.green,
		late: chartColors.amber,
		absent: chartColors.red,
	};
	return (
		<>
			{parts
				.filter((part) => part.height > 0)
				.map((part) => (
					<Path
						key={part.key}
						d={attendanceBarPath(
							x + (slot - barWidth) / 2,
							part.y,
							barWidth,
							part.height,
							part.radius,
						)}
						fill={colors[part.key]}
					/>
				))}
			<SvgText
				x={x + slot / 2}
				y={height + space.md}
				textAnchor="middle"
				fontFamily={font.regular}
				fontSize={typography.caption.fontSize}
				fill={theme.text.secondary}
			>
				{point.label}
			</SvgText>
		</>
	);
};
