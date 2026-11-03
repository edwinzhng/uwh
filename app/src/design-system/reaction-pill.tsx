import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { useButtonHaptics } from "./haptics";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space, typography } from "./tokens";

export const ReactionPill = ({
	label,
	accessibilityLabel,
	isSelected,
	isDisabled,
	onPress,
}: {
	label: string;
	accessibilityLabel: string;
	isSelected: boolean;
	isDisabled?: boolean;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected: isSelected, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={(): void => {
				onPress();
				haptic();
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={({ pressed }) => ({
				minHeight: typography.small.lineHeight + space.xxs * 2,
				minWidth: geometry.compactControl,
				paddingHorizontal: space.xs,
				paddingVertical: space.half,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.panel,
				borderWidth: geometry.border,
				borderColor: isSelected
					? theme.colorScales.accent.border
					: theme.border,
				backgroundColor:
					pressed || hovered
						? theme.background.hover
						: isSelected
							? theme.colorScales.accent.muted
							: theme.background.primary,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
			})}
		>
			<Text variant="small" weight="semibold">
				{label}
			</Text>
		</Pressable>
	);
};
