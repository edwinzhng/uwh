import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Avatar } from "./avatar";
import { useButtonHaptics } from "./haptics";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
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
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			style={({ pressed }) => ({
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.pill,
				backgroundColor: pressed ? theme.background.pressed : "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
			})}
		>
			<Avatar name={name} personId={personId} />
		</Pressable>
	);
};
