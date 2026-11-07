import { type ReactElement, useState } from "react";
import { Pressable } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const TextLink = ({
	label,
	onPress,
	isDisabled,
	accessibilityLabel,
	role = "link",
	compact = false,
	inline = false,
	highlightOnHover = true,
}: {
	label: string;
	onPress: () => void;
	isDisabled?: boolean;
	accessibilityLabel?: string;
	role?: "link" | "button";
	compact?: boolean;
	inline?: boolean;
	highlightOnHover?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole={role}
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ disabled: isDisabled }}
			disabled={isDisabled}
			hitSlop={
				inline ? { top: 0, bottom: space.lg, left: 0, right: 0 } : space.xs
			}
			onPress={onPress}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				alignSelf: compact ? "flex-start" : undefined,
				paddingHorizontal: inline ? 0 : space.xs,
				paddingVertical: inline ? 0 : space.xxs,
				borderRadius: corners.item,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				backgroundColor:
					pressed || (hovered && highlightOnHover)
						? theme.background.hover
						: "transparent",
				outlineColor: theme.focus,
				outlineWidth: focused ? geometry.focus : 0,
				outlineOffset: geometry.focus,
			})}
		>
			<Text variant="small" tone="secondary" underline>
				{label}
			</Text>
		</Pressable>
	);
};
