import { type ReactElement, useState } from "react";
import { Pressable, Text } from "react-native";
import { Icon } from "./icon";
import type { SegmentOptionProps } from "./segment-option-props";
import { useTheme } from "./theme";
import { control, corners, font, geometry, radius, space } from "./tokens";

export const SegmentOption = ({
	label,
	icon,
	isSelected,
	indicatorReady = false,
	isDisabled,
	height,
	onSelect,
}: SegmentOptionProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const selectedBackground = theme.background.selected;
	const foreground = isSelected ? theme.text.primary : theme.text.secondary;
	return (
		<Pressable
			accessible
			focusable={!isDisabled}
			accessibilityRole="radio"
			accessibilityLabel={label}
			accessibilityState={{ checked: isSelected, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={onSelect}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={({ pressed }) => ({
				minHeight: height,
				width: icon ? height : undefined,
				paddingHorizontal: icon ? space.none : control.paddingX,
				paddingVertical: control.paddingY - control.segmentInset,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: icon ? radius.round : corners.control,
				borderWidth: geometry.border,
				borderColor:
					icon && isSelected && !indicatorReady ? theme.border : "transparent",
				backgroundColor:
					isSelected && !indicatorReady
						? selectedBackground
						: hovered && !isSelected && !isDisabled
							? theme.background.hover
							: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineOffset: -geometry.focus,
				outlineColor: theme.focus,
				opacity: isDisabled
					? geometry.disabledOpacity
					: pressed
						? geometry.pressedOpacity
						: 1,
			})}
		>
			{icon ? (
				<Icon name={icon} size="sm" color={foreground} />
			) : (
				<Text
					numberOfLines={1}
					style={{
						fontFamily: font.medium,
						fontSize: control.typography.fontSize,
						lineHeight: control.typography.lineHeight,
						color: foreground,
					}}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
};
