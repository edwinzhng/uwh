import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { useButtonHaptics } from "./haptics";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
import type { ToolbarButtonProps } from "./toolbar-button-props";

export const ToolbarButton = ({
	icon,
	label,
	onPress,
}: ToolbarButtonProps): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.control,
				backgroundColor: pressed ? theme.background.pressed : "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
			})}
		>
			<Icon name={icon === "users" ? "user" : icon} />
		</Pressable>
	);
};
