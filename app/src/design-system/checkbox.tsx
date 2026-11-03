import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { interactiveRow } from "./interactive-row-layout";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const Checkbox = ({
	label,
	checked,
	onChange,
	isDisabled = false,
	compact = false,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	isDisabled?: boolean;
	compact?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={(): void => onChange(!checked)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				minHeight: interactiveRow.minHeight,
				paddingHorizontal: compact ? 0 : interactiveRow.paddingHorizontal,
				paddingVertical: compact ? space.xxs : interactiveRow.paddingVertical,
				marginHorizontal: 0,
				borderRadius: interactiveRow.borderRadius,
				backgroundColor:
					!isDisabled && (hovered || pressed)
						? theme.background.hover
						: "transparent",
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: interactiveRow.focusOffset,
				cursor: isDisabled ? "auto" : "pointer",
			})}
		>
			<Icon name={checked ? "checkboxChecked" : "stop"} size="sm" />
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text variant="small">{label}</Text>
			</View>
		</Pressable>
	);
};
