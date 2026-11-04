import type { ReactElement } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline } from "react-native-svg";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";
export const Sparkline = ({
	values,
	label,
	variant = "line",
}: {
	values: readonly number[];
	label: string;
	variant?: "line" | "dots" | "tall" | "wide";
}): ReactElement | undefined => {
	const theme = useTheme();
	const finite = values.filter(Number.isFinite);
	if (finite.length < 2) return undefined;
	const width =
		variant === "wide"
			? geometry.touch * 6
			: variant === "tall"
				? geometry.touch * 3
				: geometry.touch * 2 + space.lg;
	const height =
		variant === "tall" || variant === "wide"
			? space.xxxl + space.md
			: space.xxxl;
	const minimum = Math.min(...finite);
	const maximum = Math.max(...finite);
	const range = maximum - minimum;
	const points = finite.map((value, index) => ({
		x: space.xxs + (index / (finite.length - 1)) * (width - space.xs),
		y: range
			? space.xs + ((maximum - value) / range) * (height - space.md)
			: height / 2,
	}));
	const coordinates = points.map((point) => `${point.x},${point.y}`).join(" ");
	const last = points.at(-1);
	const first = points.at(0);
	const color = theme.success.foreground;
	return (
		<View
			accessibilityRole="image"
			accessibilityLabel={label}
			style={{
				width: variant === "wide" ? "100%" : width,
				height,
				flexShrink: 0,
			}}
		>
			<Svg
				width="100%"
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				accessible={false}
			>
				{variant === "tall" ? (
					<Polygon
						points={`${first?.x},${height} ${coordinates} ${last?.x},${height}`}
						fill={color}
						opacity={0.08}
					/>
				) : undefined}
				<Line
					x1={space.xxs}
					x2={width - space.xxs}
					y1={height - space.xs}
					y2={height - space.xs}
					stroke={theme.border}
					strokeWidth={geometry.border}
				/>
				{variant !== "dots" ? (
					<Polyline
						points={coordinates}
						fill="none"
						stroke={color}
						strokeWidth={geometry.border * 2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				) : undefined}
				{points.map((point, index) => (
					<Circle
						key={point.x}
						cx={point.x}
						cy={point.y}
						r={variant === "dots" ? geometry.border * 4 : geometry.border * 2}
						fill={color}
						opacity={index === points.length - 1 ? 1 : 0.55}
					/>
				))}
				{last ? (
					<Circle
						cx={last.x}
						cy={last.y}
						r={geometry.border * 3}
						fill={color}
					/>
				) : undefined}
			</Svg>
		</View>
	);
};
