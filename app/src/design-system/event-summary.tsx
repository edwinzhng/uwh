import { type Href, Link } from "expo-router";
import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const EventSummary = ({
	title,
	weekday,
	day,
	month,
	dateLabel,
	time,
	venue,
	href,
}: {
	title: string;
	weekday: string;
	day: string;
	month: string;
	dateLabel: string;
	time: string;
	venue: string;
	href: Href;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<Link href={href} asChild>
			<Pressable
				accessibilityRole="link"
				accessibilityLabel={`${title}, ${dateLabel}, ${time}, ${venue}. Open event details`}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={({ pressed }) => ({
					minHeight: geometry.touch,
					borderRadius: corners.item,
					backgroundColor: pressed ? theme.background.hover : "transparent",
					outlineColor: theme.focus,
					outlineWidth: focused ? geometry.focus : 0,
					outlineOffset: geometry.focus,
				})}
			>
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
							{time} · {venue}
						</Text>
					</Stack>
				</Row>
			</Pressable>
		</Link>
	);
};
