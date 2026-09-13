import { chartColors } from "@calgarycrocs/design-system/tokens";
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
					<Legend
						formatter={(value: string): ReactElement => (
							<span style={{ color: theme.text.secondary }}>{value}</span>
						)}
						iconType="circle"
						iconSize={space.xs}
					/>
					<Bar
						dataKey="onTime"
						name="On time"
						stackId="attendance"
						fill={chartColors.green}
						isAnimationActive={animate}
					/>
					<Bar
						dataKey="late"
						name="Late"
						stackId="attendance"
						fill={chartColors.amber}
						isAnimationActive={animate}
					/>
					<Bar
						dataKey="absent"
						name="No-show"
						stackId="attendance"
						fill={chartColors.red}
						isAnimationActive={animate}
					/>
					<Bar
						dataKey="unmarked"
						name="Not marked"
						stackId="attendance"
						fill={theme.colorScales.pending.border}
						radius={[corners.item, corners.item, 0, 0]}
						isAnimationActive={animate}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};
