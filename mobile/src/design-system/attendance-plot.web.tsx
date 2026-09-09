import type { ReactElement } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { AttendancePoint } from "../domain/attendance-summary";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";
import { useMotion } from "./use-motion";

export const AttendanceChart = ({
	data,
}: {
	data: AttendancePoint[];
}): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
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
				<BarChart
					data={data}
					accessibilityLayer
					margin={{ top: space.sm, right: space.xs, bottom: 0, left: 0 }}
				>
					<CartesianGrid vertical={false} stroke={theme.border} />
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
					<Legend iconType="circle" iconSize={space.xs} />
					<Bar
						dataKey="onTime"
						name="On time"
						stackId="attendance"
						fill={theme.accent.background}
						isAnimationActive={animate}
					/>
					<Bar
						dataKey="late"
						name="Late"
						stackId="attendance"
						fill={theme.warning.foreground}
						isAnimationActive={animate}
					/>
					<Bar
						dataKey="absent"
						name="No-show"
						stackId="attendance"
						fill={theme.danger.foreground}
						isAnimationActive={animate}
					/>
					<Bar
						dataKey="unmarked"
						name="Unmarked"
						stackId="attendance"
						fill={theme.controlBorder}
						radius={[corners.item, corners.item, 0, 0]}
						isAnimationActive={animate}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};
