import { type ReactElement, useState } from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";
export type TabOptionProps = {
	label: string;
	selected: boolean;
	indicatorReady?: boolean;
	disabled?: boolean;
	onPress: (keyboard?: boolean) => void;
	onFocus?: () => void;
};
export const TabOption = ({
	label,
	selected,
	indicatorReady = false,
	disabled,
	onPress,
	onFocus,
}: TabOptionProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected, disabled }}
			accessibilityLabel={label}
			disabled={disabled}
			onPress={(): void => onPress()}
			onFocus={(): void => {
				setFocused(true);
				onFocus?.();
			}}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				minHeight: geometry.touch,
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				justifyContent: "center",
				paddingHorizontal: space.xs,
				borderRadius: corners.control,
				backgroundColor:
					selected && !indicatorReady
						? theme.mode === "dark"
							? theme.background.selected
							: theme.background.primary
						: "transparent",
				opacity: disabled
					? geometry.disabledOpacity
					: pressed
						? geometry.pressedOpacity
						: 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			<Text
				style={{
					fontFamily: font.medium,
					fontSize: typography.label.fontSize,
					lineHeight: typography.label.lineHeight,
					color: selected ? theme.text.primary : theme.text.secondary,
				}}
			>
				{label}
			</Text>
		</Pressable>
	);
};
