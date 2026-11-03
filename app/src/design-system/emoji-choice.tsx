import { type ReactElement, useState } from "react";
import { Pressable, Text } from "react-native";
import { emojiBrowserMetrics } from "./emoji-browser-model";
import { useButtonHaptics } from "./haptics";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const EmojiChoice = ({
	emoji,
	label,
	onSelect,
	isDisabled,
	isSelected = false,
}: {
	emoji: string;
	label: string;
	onSelect: (emoji: string) => void;
	isDisabled?: boolean;
	isSelected?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const haptic = useButtonHaptics();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: isDisabled, selected: isSelected }}
			disabled={isDisabled}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onPress={(): void => {
				if (isDisabled) return;
				onSelect(emoji);
				haptic();
			}}
			style={({ pressed }) => ({
				width: geometry.touch,
				height: emojiBrowserMetrics.rowHeight,
				minHeight: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.item,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
				backgroundColor: pressed
					? theme.background.pressed
					: isSelected
						? theme.background.selected
						: "transparent",
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				paddingVertical: space.xxs,
			})}
		>
			<Text
				allowFontScaling={false}
				style={{
					fontSize: emojiBrowserMetrics.glyphSize,
					lineHeight: emojiBrowserMetrics.glyphLineHeight,
				}}
			>
				{emoji}
			</Text>
		</Pressable>
	);
};
