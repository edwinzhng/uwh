import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Row } from "./row";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type Props = {
	title: string;
	time: string;
	endTime: string;
	venue: string;
	onOpen: () => void;
	actions?: ReactNode;
};
export const EventCard = ({
	title,
	time,
	endTime,
	venue,
	onOpen,
	actions,
}: Props): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Surface padding="none">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`Open ${title}, ${time}, ${venue}`}
				onPress={onOpen}
				onHoverIn={(): void => setHovered(true)}
				onHoverOut={(): void => setHovered(false)}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				style={({ pressed }) => ({
					padding: space.sm,
					minHeight: geometry.touch,
					borderTopLeftRadius: corners.panel - geometry.border,
					borderTopRightRadius: corners.panel - geometry.border,
					borderBottomLeftRadius: actions ? 0 : corners.panel - geometry.border,
					borderBottomRightRadius: actions
						? 0
						: corners.panel - geometry.border,
					backgroundColor:
						hovered || pressed ? theme.background.hover : "transparent",
					outlineWidth: focused ? geometry.focus : 0,
					outlineOffset: -geometry.focus,
					outlineColor: theme.focus,
				})}
			>
				<Row align="start" gap="sm">
					<Stack grow gap="xxs">
						<Row wrap gap="sm">
							<Text variant="label">{title}</Text>
							<Text variant="label">
								{time}–{endTime}
							</Text>
						</Row>
						<Text variant="caption" tone="secondary">
							{venue}
						</Text>
					</Stack>
					<Icon name="chevron" size="sm" tone="secondary" />
				</Row>
			</Pressable>
			{actions ? (
				<View
					style={{
						paddingHorizontal: space.sm,
						paddingVertical: space.xs,
						borderTopWidth: geometry.border,
						borderTopColor: theme.border,
					}}
				>
					{actions}
				</View>
			) : undefined}
		</Surface>
	);
};
