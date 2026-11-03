import { type ReactElement, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "./avatar";
import { Icon, type IconName } from "./icon";
import { type PickerLayoutKind, pickerTriggerWidth } from "./picker-layout";
import { usePickerSizing } from "./picker-layout-context";
import type { ChoicePerson, StatusTone } from "./picker-props";
import { useTheme } from "./theme";
import { control, corners, font, geometry } from "./tokens";

type Props = {
	label: string;
	value: string;
	isOpen: boolean;
	isDisabled?: boolean;
	person?: ChoicePerson;
	icon?: IconName;
	tone?: StatusTone;
	onPress: () => void;
	compact?: boolean;
	kind?: PickerLayoutKind;
};

export const PickerTrigger = ({
	label,
	value,
	person,
	isOpen,
	isDisabled,
	icon = "chevronDown",
	onPress,
	tone,
	compact = false,
	kind = "field",
}: Props): ReactElement => {
	const theme = useTheme();
	const inDialog = usePickerSizing();
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
				width: pickerTriggerWidth({ inDialog, compact, kind }),
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
					borderColor: tone
						? theme.colorScales[tone].border
						: theme.controlBorder,
					borderRadius: corners.control,
					outlineWidth: focused ? geometry.focus : 0,
					outlineColor: theme.focus,
					outlineOffset: geometry.focus,
					opacity: isDisabled ? geometry.disabledOpacity : 1,
				}}
			>
				{person ? (
					<Avatar name={person.name ?? value} personId={person.id} compact />
				) : undefined}
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
