import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { Icon, type IconName } from "./icon";
import { MenuAvatar } from "./menu-avatar";
import { type PickerLayoutKind, pickerTriggerWidth } from "./picker-layout";
import { usePickerSizing } from "./picker-layout-context";
import type { ChoicePerson, StatusTone } from "./picker-props";
import { PoolAddGlyph } from "./pool-add-glyph";
import { useTheme } from "./theme";
import { control, corners, font, geometry } from "./tokens";

export const NativeMenuTrigger = ({
	appearance = "field",
	add,
	avatar,
	label,
	accessibilityLabel = label,
	icon,
	compact,
	isDisabled,
	tone,
	kind = "action",
	availableWidth,
}: {
	appearance?: "field" | "context";
	add?: boolean;
	avatar?: ChoicePerson;
	label: string;
	accessibilityLabel?: string;
	icon?: IconName;
	compact?: boolean;
	isDisabled?: boolean;
	tone?: StatusTone;
	kind?: PickerLayoutKind;
	availableWidth?: number;
}): ReactElement => {
	const theme = useTheme();
	const inDialog = usePickerSizing();
	if (add || avatar)
		return (
			<View
				accessible
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={{ disabled: isDisabled }}
				style={{
					width: geometry.touch,
					height: geometry.touch,
					alignItems: avatar ? "center" : "flex-end",
					justifyContent: avatar ? "center" : "flex-start",
				}}
			>
				{avatar ? <MenuAvatar person={avatar} /> : <PoolAddGlyph />}
			</View>
		);
	return (
		<View
			accessible
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled: isDisabled }}
			style={{
				minHeight: geometry.touch,
				minWidth: geometry.touch,
				alignSelf: "flex-start",
				width:
					appearance === "context"
						? undefined
						: pickerTriggerWidth({
								inDialog,
								compact,
								icon: Boolean(icon),
								kind,
								availableWidth,
							}),
				maxWidth: "100%",
				justifyContent: "center",
				opacity: isDisabled ? geometry.disabledOpacity : 1,
			}}
		>
			<View
				style={{
					minHeight: geometry.touch,
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: control.gap,
					paddingHorizontal: icon ? 0 : control.paddingX,
					paddingVertical: control.paddingY,
					borderRadius: corners.control,
					borderWidth: icon || appearance === "context" ? 0 : geometry.border,
					borderColor: tone
						? theme.colorScales[tone].border
						: theme.controlBorder,
					backgroundColor:
						icon || appearance === "context"
							? "transparent"
							: tone
								? theme[tone].background
								: theme.background.primary,
				}}
			>
				{icon ? (
					<Icon name={icon} size="sm" tone="secondary" />
				) : (
					<>
						<Text
							numberOfLines={appearance === "context" ? undefined : 1}
							style={{
								flex: appearance === "context" ? undefined : 1,
								flexShrink: 1,
								fontFamily: font.medium,
								fontSize: control.typography.fontSize,
								lineHeight: control.typography.lineHeight,
								color: tone ? theme[tone].foreground : theme.text.primary,
							}}
						>
							{label}
						</Text>
						<Icon name="chevronDown" size="sm" tone={tone ?? "secondary"} />
					</>
				)}
			</View>
		</View>
	);
};
