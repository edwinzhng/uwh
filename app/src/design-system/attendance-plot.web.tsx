import { type ReactElement, useId } from "react";
import {
	Bar,
	BarChart,
	type BarShapeProps,
	BarStack,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { AttendancePoint } from "../domain/attendance-summary";
import { AttendanceBar } from "./attendance-bar.web";
import {
	attendanceChartLabel,
	attendanceChartPoints,
	attendanceStackOrder,
} from "./attendance-plot-model";
import { chartEasing } from "./chart-animation";
import { chartColors } from "./rainbow-palette";
import { useTheme } from "./theme";
import { corners, font, geometry, motion, space, typography } from "./tokens";
import { useMotion } from "./use-motion";

export const AttendanceChart = ({
	data,
}: {
	data: AttendancePoint[];
}): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
	const gradientId = useId();
	const points = attendanceChartPoints(data);
	const segments = {
		onTime: { label: "On time", color: chartColors.green },
		late: { label: "Late", color: chartColors.amber },
		absent: { label: "No-show", color: chartColors.red },
	};
	return (
		<figure
			aria-label={attendanceChartLabel(points)}
			style={{
				margin: 0,
				width: "100%",
				height: geometry.chart,
				fontFamily: font.regular,
				fontSize: typography.caption.fontSize,
			}}
		>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={points}
					maxBarSize={geometry.chartBar}
					accessibilityLayer
					margin={{ top: space.sm, right: space.xs, bottom: 0, left: 0 }}
				>
					<defs>
						{attendanceStackOrder.map((segment) => (
							<linearGradient
								key={segment}
								id={`${gradientId}-${segment}`}
								x1="0"
								y1="0"
								x2="1"
								y2="0"
							>
								<stop
									offset="0"
									stopColor={segments[segment].color}
									stopOpacity={0.7}
								/>
								<stop offset="1" stopColor={segments[segment].color} />
							</linearGradient>
						))}
					</defs>
					<CartesianGrid
						vertical={false}
						stroke={theme.border}
						strokeLinecap="round"
					/>
					<XAxis
						dataKey="label"
						axisLine={false}
						tickLine={false}
						tickMargin={space.xs}
						tick={{ fill: theme.text.secondary }}
					/>
					<YAxis
						allowDecimals={false}
						axisLine={false}
						tickLine={false}
						width={space.xl}
						tick={{ fill: theme.text.secondary }}
					/>
					<Tooltip
						cursor={{ fill: theme.background.hover }}
						contentStyle={{
							background: theme.background.primary,
							border: `${geometry.border}px solid ${theme.border}`,
							borderRadius: corners.panel,
							color: theme.text.primary,
						}}
					/>
					<Legend
						formatter={(value: string): ReactElement => (
							<span style={{ color: theme.text.secondary }}>{value}</span>
						)}
						iconType="circle"
						iconSize={space.xs}
					/>
					<BarStack>
						{attendanceStackOrder.map((segment) => (
							<Bar
								key={segment}
								dataKey={segment}
								name={segments[segment].label}
								fill={`url(#${gradientId}-${segment})`}
								isAnimationActive={animate}
								animationDuration={motion.duration.slow}
								animationEasing={chartEasing}
								shape={(props: BarShapeProps): ReactElement => (
									<AttendanceBar
										point={points.at(props.originalDataIndex)}
										segment={segment}
										x={props.x}
										y={props.y}
										width={props.width}
										height={props.height}
										fill={props.fill}
									/>
								)}
							/>
						))}
					</BarStack>
				</BarChart>
			</ResponsiveContainer>
		</figure>
	);
};
