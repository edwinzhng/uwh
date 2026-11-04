import { type ReactElement, useId, useState } from "react";
import { View } from "react-native";
import Svg, {
	Circle,
	Defs,
	G,
	Line,
	LinearGradient,
	Path,
	Stop,
	Text as SvgText,
} from "react-native-svg";
import { chartPalette } from "./chart-palette";
import { Row } from "./row";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";
import { useTheme } from "./theme";
import { font, geometry, space, typography } from "./tokens";
import { trendDates, trendDomain, trendPosition } from "./trend-chart-model";
import type { TrendChartProps } from "./trend-chart-props";

export const TrendChart = ({
	series: inputSeries,
	maximum,
	formatValue = String,
}: TrendChartProps): ReactElement => {
	const theme = useTheme();
	const series = inputSeries.map((entry) => ({
		...entry,
		points: [
			...new Map(entry.points.map((point) => [point.date, point])).values(),
		],
	}));
	const id = useId().replace(/[^a-zA-Z0-9]/g, "");
	const [width, setWidth] = useState<number>(geometry.messageImage);
	const [selectedDate, setSelectedDate] = useState<string>();
	const dates = trendDates(series);
	const [min, max] = trendDomain(series, maximum);
	const colors = [...chartPalette.series, theme.colorScales.pending.muted];
	const left = space.xxl + space.sm;
	const right = width - space.sm;
	const bottom = geometry.chart - space.xl;
	const x = (date: string): number =>
		left + trendPosition(dates.indexOf(date), dates.length) * (right - left);
	const y = (value: number): number =>
		space.sm + (1 - (value - min) / (max - min || 1)) * (bottom - space.sm);
	return (
		<Stack gap="xs">
			<View
				onLayout={({ nativeEvent }): void => setWidth(nativeEvent.layout.width)}
				style={{ height: geometry.chart }}
			>
				<Svg
					width={width}
					height={geometry.chart}
					accessibilityLabel={series
						.map(
							(entry) =>
								`${entry.label}: ${entry.points.map((point) => `${point.date} ${formatValue(point.value)}`).join(", ")}`,
						)
						.join(". ")}
				>
					<Defs>
						{series.map((entry, index) => (
							<LinearGradient
								key={entry.id}
								id={`${id}-${index}`}
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<Stop
									offset="0%"
									stopColor={colors.at(index % colors.length)}
									stopOpacity={0.25}
								/>
								<Stop
									offset="100%"
									stopColor={colors.at(index % colors.length)}
									stopOpacity={0.02}
								/>
							</LinearGradient>
						))}
					</Defs>
					{[0, 0.5, 1].map((fraction) => {
						const value = min + (max - min) * fraction;
						return (
							<G key={fraction}>
								<Line
									x1={left}
									x2={right}
									y1={y(value)}
									y2={y(value)}
									stroke={theme.border}
								/>
								<SvgText
									x={left - space.xs}
									y={y(value) + space.xxs}
									textAnchor="end"
									fill={theme.text.secondary}
									fontSize={typography.caption.fontSize}
									fontFamily={font.regular}
								>
									{formatValue(value)}
								</SvgText>
							</G>
						);
					})}
					{series.map((entry, index) => {
						const points = entry.points
							.slice()
							.sort((a, b) => a.date.localeCompare(b.date));
						const first = points.at(0);
						const last = points.at(-1);
						const path = points
							.map(
								(point, index) =>
									`${index ? "L" : "M"} ${x(point.date)} ${y(point.value)}`,
							)
							.join(" ");
						const color = colors.at(index % colors.length);
						return (
							<G key={entry.id}>
								{first && last && points.length > 1 ? (
									<Path
										d={`${path} L ${x(last.date)} ${bottom} L ${x(first.date)} ${bottom} Z`}
										fill={`url(#${id}-${index})`}
									/>
								) : undefined}
								<Path
									d={path}
									fill="none"
									stroke={color}
									strokeWidth={geometry.focus}
									strokeLinejoin="round"
									strokeLinecap="round"
								/>
								{points.map((point) => (
									<G
										key={point.date}
										accessible
										onPress={(): void => setSelectedDate(point.date)}
										accessibilityRole="button"
										accessibilityLabel={`${entry.label}, ${point.date}, ${formatValue(point.value)}`}
									>
										<Circle
											cx={x(point.date)}
											cy={y(point.value)}
											r={geometry.touch / 2}
											fill="transparent"
										/>
										<Circle
											cx={x(point.date)}
											cy={y(point.value)}
											r={selectedDate === point.date ? space.xs : space.xxs}
											fill={color}
											stroke={theme.background.card}
											strokeWidth={geometry.border}
										/>
									</G>
								))}
							</G>
						);
					})}
					{[dates.at(0), dates.length > 1 ? dates.at(-1) : undefined]
						.filter((date): date is string => Boolean(date))
						.map((date) => (
							<SvgText
								key={date}
								x={x(date)}
								y={geometry.chart - space.xs}
								textAnchor="middle"
								fill={theme.text.secondary}
								fontSize={typography.caption.fontSize}
								fontFamily={font.regular}
							>
								{date.slice(5)}
							</SvgText>
						))}
				</Svg>
				{selectedDate ? (
					<View
						pointerEvents="none"
						style={{
							position: "absolute",
							top: space.xs,
							left: Math.max(
								left,
								Math.min(x(selectedDate) - space.xxl, width - 180),
							),
							maxWidth: 180,
						}}
					>
						<Surface padding="sm">
							<Stack gap="xxs">
								<Text variant="caption" tone="secondary">
									{selectedDate}
								</Text>
								{series.flatMap((entry) =>
									entry.points
										.filter((point) => point.date === selectedDate)
										.map((point) => (
											<Row key={entry.id} gap="xs">
												<Text variant="caption">{entry.label}</Text>
												<Text variant="label">{formatValue(point.value)}</Text>
											</Row>
										)),
								)}
							</Stack>
						</Surface>
					</View>
				) : undefined}
			</View>
			{series.length > 1 ? (
				<Row wrap gap="sm">
					{series.map((entry, index) => (
						<Row key={entry.id} gap="xxs">
							<View
								style={{
									width: space.xs,
									height: space.xs,
									backgroundColor: colors.at(index % colors.length),
								}}
							/>
							<Text variant="caption">{entry.label}</Text>
						</Row>
					))}
				</Row>
			) : undefined}
		</Stack>
	);
};
