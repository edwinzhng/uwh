import type { ReactElement } from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";
import type { TrendChartProps } from "./trend-chart-props";
import { useMotion } from "./use-motion";
export const TrendChart = ({
	series,
	formatValue = String,
}: TrendChartProps): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
	const colors = [
		theme.accent.background,
		theme.coach.foreground,
		theme.success.foreground,
		theme.warning.foreground,
	];
	const dates = [
		...new Set(
			series.flatMap((entry) => entry.points.map((point) => point.date)),
		),
	].sort();
	const values = series.map(
		(entry) => new Map(entry.points.map((point) => [point.date, point.value])),
	);
	const data = dates.map((date) => ({
		date,
		...Object.fromEntries(
			series.map((_entry, index) => [
				`series${index}`,
				values.at(index)?.get(date) ?? null,
			]),
		),
	}));
	return (
		<div
			style={{
				width: "100%",
				height: geometry.chart,
				fontFamily: font.regular,
				fontSize: typography.caption.fontSize,
			}}
		>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					accessibilityLayer
					margin={{ top: space.sm, right: space.sm, bottom: 0, left: space.sm }}
				>
					<CartesianGrid vertical={false} stroke={theme.border} />
					<XAxis
						dataKey="date"
						tickFormatter={(date: string): string => date.slice(5)}
						axisLine={false}
						tickLine={false}
						minTickGap={space.lg}
						tick={{ fill: theme.text.secondary }}
					/>
					<YAxis
						tickFormatter={formatValue}
						axisLine={false}
						tickLine={false}
						width={space.xxl}
						tick={{ fill: theme.text.secondary }}
					/>
					<Tooltip
						formatter={(value): string => formatValue(Number(value))}
						contentStyle={{
							background: theme.background.primary,
							border: `${geometry.border}px solid ${theme.border}`,
							borderRadius: corners.panel,
							color: theme.text.primary,
						}}
					/>
					<Legend iconType="circle" iconSize={space.xs} />
					{series.map((entry, index) => (
						<Line
							key={entry.id}
							name={entry.label}
							dataKey={`series${index}`}
							stroke={colors.at(index % colors.length)}
							strokeWidth={geometry.focus}
							dot={{ r: space.xxs }}
							activeDot={{ r: space.xxs }}
							connectNulls={false}
							isAnimationActive={animate}
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};
