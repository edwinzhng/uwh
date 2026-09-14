import type { ReactElement } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";
import { chartPalette } from "./chart-palette";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { font, geometry, space, typography } from "./tokens";
import type { TrendChartProps } from "./trend-chart-props";
export const TrendChart = ({
	series,
	formatValue = String,
}: TrendChartProps): ReactElement => {
	const theme = useTheme();
	const colors = [...chartPalette.series, theme.colorScales.pending.muted];
	const dates = [
		...new Set(
			series.flatMap((entry) => entry.points.map((point) => point.date)),
		),
	].sort();
	const width = geometry.messageImage;
	const height = geometry.chart - space.xxl;
	const max = Math.max(
		1,
		...series.flatMap((entry) => entry.points.map((point) => point.value)),
	);
	const x = (date: string): number =>
		space.xxl +
		(dates.indexOf(date) / Math.max(1, dates.length - 1)) *
			(width - space.xxl - space.sm);
	const y = (value: number): number =>
		space.sm + height - (value / max) * height;
	return (
		<Stack gap="xs">
			<View
				accessibilityRole="image"
				accessibilityLabel={series
					.map(
						(entry) =>
							`${entry.label}: ${entry.points.map((point) => `${point.date} ${formatValue(point.value)}`).join(", ")}`,
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
							x1={space.xxl}
							x2={width}
							y1={y(max * fraction)}
							y2={y(max * fraction)}
							stroke={theme.border}
						/>
					))}
					{[0, 0.5, 1].map((fraction) => (
						<SvgText
							key={fraction}
							x={0}
							y={y(max * fraction)}
							fill={theme.text.secondary}
							fontSize={typography.caption.fontSize}
							fontFamily={font.regular}
						>
							{formatValue(max * fraction)}
						</SvgText>
					))}
					{series.flatMap((entry, index) =>
						entry.points.map((point) => {
							const position = dates.indexOf(point.date);
							const previous =
								position > 0
									? entry.points.find(
											(candidate) => candidate.date === dates.at(position - 1),
										)
									: undefined;
							return (
								<G key={`${entry.id}:${point.date}`}>
									{previous ? (
										<Line
											x1={x(previous.date)}
											y1={y(previous.value)}
											x2={x(point.date)}
											y2={y(point.value)}
											stroke={colors.at(index % colors.length)}
											strokeWidth={geometry.focus}
										/>
									) : undefined}
									<Circle
										cx={x(point.date)}
										cy={y(point.value)}
										r={space.xxs}
										fill={colors.at(index % colors.length)}
									/>
								</G>
							);
						}),
					)}
					{[dates.at(0), dates.length > 1 ? dates.at(-1) : undefined]
						.filter((date): date is string => Boolean(date))
						.map((date) => (
							<SvgText
								key={date}
								x={x(date)}
								y={height + space.lg}
								textAnchor={date === dates.at(-1) ? "end" : "start"}
								fill={theme.text.secondary}
								fontSize={typography.caption.fontSize}
								fontFamily={font.regular}
							>
								{date.slice(5)}
							</SvgText>
						))}
				</Svg>
			</View>
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
		</Stack>
	);
};
