import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "./avatar";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
import { ToolbarHighlight } from "./toolbar-highlight";

export const EditableAvatar = ({
	name,
	uri,
	icon,
	initials,
	label,
	isDisabled = false,
	onPress,
}: {
	name: string;
	uri?: string;
	icon?: IconName;
	initials?: boolean;
	label: string;
	isDisabled?: boolean;
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
			accessibilityState={{ disabled: isDisabled }}
			disabled={isDisabled}
			onPress={(): void => {
				haptic();
				onPress();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onPressIn={(): void => setPressed(true)}
			onPressOut={(): void => setPressed(false)}
			style={{
				width: geometry.avatar * 2,
				height: geometry.avatar * 2,
				borderRadius: corners.pill,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: geometry.focus,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
			}}
		>
			<Avatar name={name} uri={uri} icon={icon} initials={initials} large />
			<ToolbarHighlight active={!isDisabled && (hovered || pressed)} />
			<View
				pointerEvents="none"
				accessible={false}
				style={{
					position: "absolute",
					right: 0,
					bottom: 0,
					width: geometry.compactAvatar,
					height: geometry.compactAvatar,
					borderRadius: corners.pill,
					borderWidth: geometry.focus,
					borderColor: theme.background.primary,
					backgroundColor: theme.accent.background,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Icon name="image" size="sm" color={theme.accent.foreground} />
			</View>
		</Pressable>
	);
};
