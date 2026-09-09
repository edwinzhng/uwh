import { type ReactElement, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./icon";
import type { StatusTone } from "./picker-props";
import { useTheme } from "./theme";
import { control, corners, font, geometry } from "./tokens";

type Props = {
	label: string;
	value: string;
	isOpen: boolean;
	isDisabled?: boolean;
	icon?: IconName;
	tone?: StatusTone;
	onPress: () => void;
};

export const PickerTrigger = ({
	label,
	value,
	isOpen,
	isDisabled,
	icon = "chevronDown",
	onPress,
	tone,
}: Props): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}, ${value}`}
			accessibilityState={{ expanded: isOpen, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={onPress}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={{
				minHeight: geometry.touch,
				justifyContent: "center",
				width: geometry.popupWidth,
				maxWidth: "100%",
			}}
		>
			<View
				style={{
					minHeight: geometry.touch,
					flexDirection: "row",
					alignItems: "center",
					gap: control.gap,
					paddingHorizontal: control.paddingX,
					paddingVertical: control.paddingY,
					backgroundColor: tone
						? theme[tone].background
						: theme.background.primary,
					borderWidth: geometry.border,
					borderColor: tone ? theme.colorScales[tone].border : theme.border,
					borderRadius: corners.control,
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
					outlineOffset: geometry.focus,
					opacity: isDisabled ? geometry.disabledOpacity : 1,
				}}
			>
				<Text
					numberOfLines={1}
					style={{
						flex: 1,
						fontFamily: font.medium,
						fontSize: control.typography.fontSize,
						lineHeight: control.typography.lineHeight,
						color: tone ? theme[tone].foreground : theme.text.primary,
					}}
				>
					{value}
				</Text>
				<Icon name={icon} size="sm" tone={tone ?? "secondary"} />
			</View>
		</Pressable>
	);
};
