import { type Href, Link } from "expo-router";
import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
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
	compact = true,
	status,
	actions,
	footer,
	children,
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
	footer?: ReactNode;
	children?: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const rail = dateLayout === "rail" || dateLayout === "badge";
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "stretch",
				gap: space.xs,
				minWidth: 0,
			}}
		>
			{rail ? (
				<View
					style={{
						minWidth: geometry.touch,
						flexShrink: 0,
						padding: dateLayout === "badge" ? space.xs : 0,
						paddingRight: dateLayout === "rail" ? space.sm : space.xs,
						borderRadius: dateLayout === "badge" ? corners.control : 0,
						borderRightWidth: dateLayout === "rail" ? geometry.border : 0,
						borderRightColor: theme.border,
						backgroundColor:
							dateLayout === "badge"
								? theme.background.secondary
								: "transparent",
					}}
				>
					{dateLayout === "rail" ? (
						<Text variant="overline" tone="secondary" align="center">
							{weekday.toUpperCase()}
						</Text>
					) : undefined}
					<Text
						variant={dateLayout === "rail" ? "number" : "h4"}
						align="center"
					>
						{day}
					</Text>
					<Text variant="overline" tone="secondary" align="center">
						{month}
					</Text>
				</View>
			) : undefined}
			<View style={{ flex: 1, minWidth: 0 }}>
				<View
					style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}
				>
					<Link href={href} asChild>
						<Pressable
							accessibilityRole="link"
							accessibilityLabel={`${title}, ${dateLabel}, ${time}, ${venue}. Open event details`}
							onHoverIn={(): void => setHovered(true)}
							onHoverOut={(): void => setHovered(false)}
							onFocus={(): void => setFocused(true)}
							onBlur={(): void => setFocused(false)}
							style={({ pressed }) => ({
								flex: 1,
								minWidth: 0,
								minHeight: geometry.touch,
								justifyContent: "center",
								borderRadius: corners.item,
								backgroundColor:
									pressed || hovered ? theme.background.hover : "transparent",
								outlineColor: theme.focus,
								outlineWidth: focused ? geometry.focus : 0,
								outlineOffset: geometry.focus,
							})}
						>
							{dateLayout === "inline" || dateLayout === "agenda" ? (
								<Text variant="overline" tone="secondary" lines={1}>
									{weekday} {day} {month}
								</Text>
							) : undefined}
							<Text
								variant={compact ? "small" : "h4"}
								weight="semibold"
								lines={1}
							>
								{title}
							</Text>
						</Pressable>
					</Link>
					{status}
					{actions}
				</View>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: space.xs,
						minWidth: 0,
					}}
				>
					<View style={{ flexShrink: 1, minWidth: 0 }}>
						<Text variant="caption" tone="secondary" lines={1}>
							{venue}
						</Text>
					</View>
					{footer}
				</View>
				{children}
			</View>
		</View>
	);
};
