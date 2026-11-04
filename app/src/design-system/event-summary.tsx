import { type Href, Link } from "expo-router";
import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { wrappingMetadata } from "./time-location";
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
	const [hovered, setHovered] = useState(false);
	const metadata = wrappingMetadata(
		dateLayout === "badge" ? [weekday, time, venue] : [time, venue],
	);
	const text = (
		<Stack grow gap="xxs">
			{dateLayout === "inline" ? (
				<Text variant="overline" tone="secondary" lines={1}>
					{weekday} {day} {month}
				</Text>
			) : undefined}
			<Text variant={compact ? "small" : "h4"} weight="semibold" lines={2}>
				{title}
			</Text>
			{dateLayout === "agenda" ? (
				<Text variant="overline" tone="secondary" lines={1}>
					{weekday} {day} {month}
				</Text>
			) : undefined}
			<Text
				variant={compact ? "overline" : "caption"}
				tone="secondary"
				lines={2}
			>
				{metadata}
			</Text>
		</Stack>
	);
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "flex-start",
				gap: space.xs,
				minWidth: 0,
			}}
		>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Link href={href} asChild>
					<Pressable
						accessibilityRole="link"
						accessibilityLabel={`${title}, ${dateLabel}, ${time}, ${venue}. Open event details`}
						onHoverIn={(): void => setHovered(true)}
						onHoverOut={(): void => setHovered(false)}
						onFocus={(): void => setFocused(true)}
						onBlur={(): void => setFocused(false)}
						style={({ pressed }) => ({
							width: "100%",
							minWidth: 0,
							minHeight: geometry.touch,
							borderRadius: corners.item,
							backgroundColor:
								pressed || hovered ? theme.background.hover : "transparent",
							outlineColor: theme.focus,
							outlineWidth: focused ? geometry.focus : 0,
							outlineOffset: geometry.focus,
						})}
					>
						<Stack gap="xs">
							{status}
							{dateLayout === "rail" || dateLayout === "badge" ? (
								<Row gap="sm">
									<View
										style={{
											minWidth: geometry.touch,
											flexShrink: 0,
											padding: dateLayout === "badge" ? space.xs : 0,
											paddingRight: dateLayout === "rail" ? space.sm : space.xs,
											borderRadius:
												dateLayout === "badge" ? corners.control : 0,
											borderRightWidth:
												dateLayout === "rail" ? geometry.border : 0,
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
										<Text variant="h4" align="center">
											{day}
										</Text>
										<Text variant="overline" tone="secondary" align="center">
											{month}
										</Text>
									</View>
									{text}
								</Row>
							) : (
								text
							)}
						</Stack>
					</Pressable>
				</Link>
			</View>
			{actions ? <View style={{ flexShrink: 0 }}>{actions}</View> : undefined}
		</View>
	);
};
