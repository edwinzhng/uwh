import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { GlassBackdrop } from "./glass-backdrop";
import { Icon, type IconName } from "./icon";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const GlassIconButton = ({
	icon,
	label,
	onPress,
}: {
	icon: IconName;
	label: string;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const colors = materialColors(theme);
	const [hovered, setHovered] = useState(false);
	const [pressed, setPressed] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			onPressIn={(): void => setPressed(true)}
			onPressOut={(): void => setPressed(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={{
				width: geometry.touch,
				height: geometry.touch,
				borderRadius: corners.pill,
				borderWidth: geometry.border,
				borderColor: colors.border,
				boxShadow: colors.shadow,
				overflow: "hidden",
				outlineColor: theme.focus,
				outlineWidth: focused ? geometry.focus : 0,
				outlineOffset: geometry.focus,
			}}
		>
			<GlassBackdrop material="floating" />
			<View
				pointerEvents="none"
				style={{
					flex: 1,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: pressed
						? colors.pressed
						: hovered
							? colors.hover
							: "transparent",
					borderRadius: corners.pill,
				}}
			>
				<Icon name={icon} />
			</View>
		</Pressable>
	);
};
