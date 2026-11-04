import { type ReactElement, useId, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { chartEasing } from "./chart-animation";
import { chartPalette } from "./chart-palette";
import { useTheme } from "./theme";
import { font, geometry, motion, space, typography } from "./tokens";
import { trendDates, trendDomain, trendPosition } from "./trend-chart-model";
import type { TrendChartProps } from "./trend-chart-props";
import { TrendTooltip } from "./trend-tooltip.web";
import { useMotion } from "./use-motion";
export const TrendChart = ({
	series,
	maximum,
	formatValue = String,
}: TrendChartProps): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	const [width, setWidth] = useState(320);
	const colors = [...chartPalette.series, theme.colorScales.pending.muted];
	const dates = trendDates(series);
	const plotWidth = Math.max(1, width - space.xxl - space.sm * 2);
	const horizontalPadding = plotWidth * trendPosition(0, dates.length);
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
			<ResponsiveContainer
				width="100%"
				height="100%"
				onResize={(width): void => setWidth(width)}
			>
				<AreaChart
					data={data}
					accessibilityLayer
					margin={{ top: space.sm, right: space.sm, bottom: 0, left: space.sm }}
				>
					<defs>
						{series.map((entry, index) => (
							<linearGradient
								key={entry.id}
								id={`${id}-${index}`}
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor={colors.at(index % colors.length)}
									stopOpacity={0.25}
								/>
								<stop
									offset="100%"
									stopColor={colors.at(index % colors.length)}
									stopOpacity={0.02}
								/>
							</linearGradient>
						))}
					</defs>
					<CartesianGrid
						vertical={false}
						stroke={theme.border}
						strokeLinecap="round"
					/>
					<XAxis
						dataKey="date"
						padding={{ left: horizontalPadding, right: horizontalPadding }}
						tickFormatter={(date: string): string => date.slice(5)}
						axisLine={false}
						tickLine={false}
						minTickGap={space.lg}
						tick={{ fill: theme.text.secondary }}
					/>
					<YAxis
						domain={trendDomain(series, maximum)}
						tickFormatter={formatValue}
						axisLine={false}
						tickLine={false}
						width={space.xxl}
						tick={{ fill: theme.text.secondary }}
					/>
					<Tooltip
						cursor={false}
						content={(props): ReactElement => (
							<TrendTooltip {...props} formatValue={formatValue} />
						)}
					/>
					{series.length > 1 ? (
						<Legend iconType="circle" iconSize={space.xs} />
					) : undefined}
					{series.map((entry, index) => (
						<Area
							key={entry.id}
							name={entry.label}
							dataKey={`series${index}`}
							stroke={colors.at(index % colors.length)}
							fill={`url(#${id}-${index})`}
							type="monotone"
							strokeWidth={geometry.focus}
							strokeLinecap="round"
							strokeLinejoin="round"
							dot={{ r: space.xxs }}
							activeDot={{ r: space.xxs }}
							connectNulls={false}
							isAnimationActive={animate}
							animationDuration={motion.duration.slow}
							animationEasing={chartEasing}
						/>
					))}
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
};
