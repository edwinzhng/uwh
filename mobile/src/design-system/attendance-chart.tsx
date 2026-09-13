import { chartColors } from "@calgarycrocs/design-system/tokens";
import type { ReactElement } from "react";
import { View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import type { AttendancePoint } from "../domain/attendance-summary";
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
	const max = Math.max(
		1,
		...data.map(
			(point) => point.onTime + point.late + point.absent + point.unmarked,
		),
	);
	const width = geometry.messageImage;
	const height = geometry.chart - space.xl;
	const slot = width / Math.max(1, data.length);
	return (
		<View
			accessibilityRole="image"
			accessibilityLabel={data
				.map(
					(point) =>
						`${point.label}: ${point.onTime} on time, ${point.late} late, ${point.absent} no-show, ${point.unmarked} unmarked`,
				)
				.join(". ")}
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
					/>
				))}
				{data.map((point, index) => (
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
					{ label: "Not marked", color: theme.colorScales.pending.border },
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
	point: AttendancePoint;
	x: number;
	slot: number;
	height: number;
	max: number;
}): ReactElement => {
	const theme = useTheme();
	const parts = [
		{ value: point.onTime, color: chartColors.green },
		{ value: point.late, color: chartColors.amber },
		{ value: point.absent, color: chartColors.red },
		{ value: point.unmarked, color: theme.colorScales.pending.border },
	];
	return (
		<>
			{parts.map((part, index) => (
				<Rect
					key={part.color}
					x={x + space.xxs}
					width={Math.max(1, slot - space.xs)}
					y={
						height -
						(parts
							.slice(0, index + 1)
							.reduce((total, entry) => total + entry.value, 0) /
							max) *
							height
					}
					height={(part.value / max) * height}
					fill={part.color}
					rx={corners.item}
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
