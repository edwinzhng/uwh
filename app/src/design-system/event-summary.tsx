import { type Href, Link } from "expo-router";
import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { formatTimeLocation } from "./time-location";
import { corners, geometry, space } from "./tokens";

export type ScheduleDateLayout = "rail" | "inline" | "badge" | "agenda";

export const EventSummary = ({
	title,
	weekday,
	day,
	month,
	dateLabel,
	time,
	venue,
	href,
	dateLayout = "rail",
	compact = false,
	status,
	actions,
}: {
	title: string;
	weekday: string;
	day: string;
	month: string;
	dateLabel: string;
	time: string;
	venue: string;
	href: Href;
	dateLayout?: ScheduleDateLayout;
	compact?: boolean;
	status?: ReactNode;
	actions?: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [actionWidth, setActionWidth] = useState(0);
	const [hovered, setHovered] = useState(false);
	return (
		<View>
			<Link href={href} asChild>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel={`${title}, ${dateLabel}, ${time}, ${venue}. Open event details`}
					onHoverIn={(): void => setHovered(true)}
					onHoverOut={(): void => setHovered(false)}
					onFocus={(): void => setFocused(true)}
					onBlur={(): void => setFocused(false)}
					style={({ pressed }) => ({
						minHeight: geometry.touch,
						borderRadius: corners.item,
						backgroundColor:
							pressed || hovered ? theme.background.hover : "transparent",
						outlineColor: theme.focus,
						outlineWidth: focused ? geometry.focus : 0,
						outlineOffset: geometry.focus,
					})}
				>
					{status || actions ? (
						<View
							style={{
								minHeight: geometry.touch,
								justifyContent: "center",
								marginBottom: space.xs,
								paddingRight: actions ? actionWidth + space.xs : 0,
							}}
						>
							{status}
						</View>
					) : undefined}
					{dateLayout === "rail" ? (
						<Row gap="sm">
							<View
								style={{
									minWidth: geometry.touch,
									paddingRight: space.sm,
									borderRightWidth: geometry.border,
									borderRightColor: theme.border,
								}}
							>
								<Stack gap="none">
									<Text variant="overline" tone="secondary" align="center">
										{weekday.toUpperCase()}
									</Text>
									<Text variant="h4" align="center">
										{day}
									</Text>
									<Text variant="overline" tone="secondary" align="center">
										{month.toUpperCase()}
									</Text>
								</Stack>
							</View>
							<Stack grow gap="xxs">
								<Text variant="h4" lines={2}>
									{title}
								</Text>
								<Text variant="caption" tone="secondary" lines={1}>
									{formatTimeLocation(time, venue)}
								</Text>
							</Stack>
						</Row>
					) : dateLayout === "badge" ? (
						<Row gap="sm">
							<View
								style={{
									minWidth: geometry.touch,
									padding: space.xs,
									borderRadius: corners.control,
									backgroundColor: theme.background.secondary,
								}}
							>
								<Text variant="h4" align="center">
									{day}
								</Text>
								<Text variant="overline" tone="secondary" align="center">
									{month}
								</Text>
							</View>
							<Stack grow gap="xxs">
								<Text
									variant={compact ? "small" : "h4"}
									weight="semibold"
									lines={2}
								>
									{title}
								</Text>
								<Text
									variant={compact ? "overline" : "caption"}
									tone="secondary"
									lines={1}
								>
									{weekday} · {formatTimeLocation(time, venue)}
								</Text>
							</Stack>
						</Row>
					) : (
						<Stack gap="xxs">
							{dateLayout === "inline" ? (
								<Text variant="overline" tone="secondary">
									{weekday} {day} {month}
								</Text>
							) : undefined}
							<Text
								variant={compact ? "small" : "h4"}
								weight="semibold"
								lines={2}
							>
								{title}
							</Text>
							{dateLayout === "agenda" ? (
								<Text variant="overline" tone="secondary">
									{weekday} {day} {month}
								</Text>
							) : undefined}
							<Text variant="caption" tone="secondary">
								{formatTimeLocation(time, venue)}
							</Text>
						</Stack>
					)}
				</Pressable>
			</Link>
			{actions ? (
				<View
					onLayout={({ nativeEvent: { layout } }): void =>
						setActionWidth(layout.width)
					}
					style={{ position: "absolute", right: 0, top: 0 }}
				>
					{actions}
				</View>
			) : undefined}
		</View>
	);
};
