import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import type { AttendanceDashboardRow } from "../domain/attendance-dashboard";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const AttendancePlayerRow = ({
	row,
	onPress,
}: {
	row: AttendanceDashboardRow;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${row.name}: ${row.attended ?? 0}% attendance, ${row.attendedCount} of ${row.total} available sessions, ${row.unmarked} unmarked${row.trend === undefined ? "" : `, ${row.trend} percentage points, last ${row.window} versus previous ${row.window} sessions`}`}
			onPress={onPress}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				flexDirection: "row",
				alignItems: "center",
				gap: space.sm,
				padding: space.sm,
				borderRadius: corners.panel,
				borderWidth: geometry.border,
				borderColor: theme.border,
				backgroundColor:
					pressed || hovered ? theme.background.hover : theme.background.card,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			<Avatar name={row.name} personId={row.id} />
			<View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
				<Text variant="small" weight="semibold" lines={1}>
					{row.name}
				</Text>
				<Text variant="caption" tone="secondary">
					{row.attendedCount}/{row.total} attended · {row.unmarked} unmarked
				</Text>
				{row.trend !== undefined ? (
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							flexWrap: "wrap",
							gap: space.xxs,
						}}
					>
						<Badge
							label={`${row.trend > 0 ? "+" : ""}${row.trend} pp`}
							kind={
								row.trend < 0 ? "danger" : row.trend > 0 ? "success" : "neutral"
							}
						/>
						<Text variant="caption" tone="secondary">
							Last {row.window} vs previous {row.window}
						</Text>
					</View>
				) : undefined}
			</View>
			<View
				style={{
					alignItems: "flex-end",
					gap: space.xs,
					width: geometry.touch + space.md,
				}}
			>
				<Text variant="h3">{row.attended ?? 0}%</Text>
				<View
					accessibilityRole="progressbar"
					accessibilityLabel={`${row.name} attendance`}
					accessibilityValue={{ min: 0, max: 100, now: row.attended ?? 0 }}
					style={{
						width: "100%",
						height: geometry.progress,
						borderRadius: corners.pill,
						backgroundColor: theme.background.secondary,
						overflow: "hidden",
					}}
				>
					<View
						style={{
							height: "100%",
							width: `${row.attended ?? 0}%`,
							backgroundColor: theme.colorScales.accent.solid,
							borderRadius: corners.pill,
						}}
					/>
				</View>
			</View>
		</Pressable>
	);
};
