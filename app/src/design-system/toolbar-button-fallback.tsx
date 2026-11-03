import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { useButtonHaptics } from "./haptics";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
import type { ToolbarButtonProps } from "./toolbar-button-props";
import { ToolbarHighlight } from "./toolbar-highlight";

export const ToolbarButton = ({
	icon,
	label,
	onPress,
}: ToolbarButtonProps): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [pressed, setPressed] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onPressIn={(): void => setPressed(true)}
			onPressOut={(): void => setPressed(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={{
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.control,
				backgroundColor: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
			}}
		>
			<Icon name={icon === "users" ? "user" : icon} />
			<ToolbarHighlight active={hovered || pressed} />
		</Pressable>
	);
};
