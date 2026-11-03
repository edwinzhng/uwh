import { type ReactElement, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useButtonHaptics } from "./haptics";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { control, corners, font, geometry } from "./tokens";

export const ContextTrigger = ({
	label,
	value,
	isOpen,
	isDisabled,
	onPress,
}: {
	label: string;
	value: string;
	isOpen: boolean;
	isDisabled?: boolean;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}, ${value}`}
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			accessibilityState={{ expanded: isOpen, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				alignSelf: "flex-start",
				maxWidth: "100%",
				minHeight: geometry.touch,
				minWidth: geometry.touch,
				justifyContent: "center",
				paddingHorizontal: control.paddingX,
				paddingVertical: control.paddingY,
				borderRadius: corners.control,
				backgroundColor: pressed ? theme.background.pressed : "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
			})}
		>
			<View
				style={{ flexDirection: "row", alignItems: "center", gap: control.gap }}
			>
				<Text
					style={{
						flexShrink: 1,
						fontFamily: font.medium,
						fontSize: control.typography.fontSize,
						lineHeight: control.typography.lineHeight,
						color: theme.text.primary,
					}}
				>
					{value}
				</Text>
				<Icon name="chevronDown" size="sm" tone="secondary" />
			</View>
		</Pressable>
	);
};
