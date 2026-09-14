import { type ReactElement, useState } from "react";
import { Pressable, Text } from "react-native";
import { Icon } from "./icon";
import type { SegmentOptionProps } from "./segment-option-props";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space } from "./tokens";

export const SegmentOption = ({
	label,
	icon,
	isSelected,
	isDisabled,
	showSelection,
	height,
	onSelect,
	onHoverChange,
}: SegmentOptionProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
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
			onHoverIn={(): void => onHoverChange(true)}
			onHoverOut={(): void => onHoverChange(false)}
			style={{
				minHeight: height,
				width: icon ? height : undefined,
				paddingHorizontal: icon ? space.none : control.paddingX,
				paddingVertical: control.paddingY - control.segmentInset,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: icon ? corners.pill : corners.control,
				borderWidth: geometry.border,
				borderColor: "transparent",
				backgroundColor: showSelection
					? theme.background.selected
					: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineOffset: -geometry.focus,
				outlineColor: theme.focus,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
			}}
		>
			{icon ? (
				<Icon
					name={icon}
					size="sm"
					tone={isSelected ? "primary" : "secondary"}
				/>
			) : (
				<Text
					numberOfLines={1}
					style={{
						fontFamily: font.medium,
						fontSize: control.typography.fontSize,
						lineHeight: control.typography.lineHeight,
						color: isSelected ? theme.text.primary : theme.text.secondary,
					}}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
};
