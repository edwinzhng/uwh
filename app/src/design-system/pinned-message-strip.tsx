import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const PinnedMessageStrip = ({
	preview,
	count,
	onPress,
	isDisabled = false,
}: {
	preview: string;
	count: number;
	onPress: () => void;
	isDisabled?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`View ${count} pinned ${count === 1 ? "message" : "messages"}`}
			accessibilityState={{ disabled: isDisabled }}
			disabled={isDisabled}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={({ pressed }) => ({
				minHeight: geometry.touch,
				alignSelf: "stretch",
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				paddingHorizontal: space.md,
				paddingVertical: space.xs,
				marginHorizontal: space.xs,
				marginVertical: space.xxs,
				borderRadius: corners.item,
				borderWidth: geometry.border,
				borderColor: theme.border,
				backgroundColor:
					!isDisabled && (pressed || hovered)
						? theme.background.tertiary
						: theme.background.secondary,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			<Icon name="pin" size="sm" tone="secondary" />
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text variant="caption" tone="secondary" lines={1}>
					{preview}
				</Text>
			</View>
			<Text variant="caption" tone="secondary">
				{count}
			</Text>
			<Icon name="chevron" size="sm" tone="secondary" />
		</Pressable>
	);
};
