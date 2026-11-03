import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Avatar } from "./avatar";
import { useButtonHaptics } from "./haptics";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
import { ToolbarHighlight } from "./toolbar-highlight";
export const ProfileTrigger = ({
	name,
	personId,
	label,
	onPress,
}: {
	name: string;
	personId: string;
	label: string;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [pressed, setPressed] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onPressIn={(): void => setPressed(true)}
			onPressOut={(): void => setPressed(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			style={{
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.pill,
				backgroundColor: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
			}}
		>
			<Avatar name={name} personId={personId} />
			<ToolbarHighlight active={hovered || pressed} />
		</Pressable>
	);
};
