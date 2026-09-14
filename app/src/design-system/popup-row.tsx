import { type ReactElement, useState } from "react";
import { Pressable, Text } from "react-native";
import { Icon, type IconName } from "./icon";
import type { StatusTone } from "./picker-props";
import { useTheme } from "./theme";
import { corners, font, geometry, space, typography } from "./tokens";

type Props = {
	label: string;
	icon?: IconName;
	isSelected?: boolean;
	isDisabled?: boolean;
	tone?: "default" | StatusTone;
	onSelect: () => void;
};

export const PopupRow = ({
	label,
	icon,
	isSelected,
	isDisabled,
	tone = "default",
	onSelect,
}: Props): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole={isSelected === undefined ? "button" : "radio"}
			accessibilityLabel={label}
			accessibilityState={{ checked: isSelected, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={onSelect}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				minHeight: geometry.touch,
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				paddingHorizontal: space.xs,
				paddingVertical: space.xxs,
				borderRadius: corners.item,
				backgroundColor:
					pressed || isSelected
						? tone === "default"
							? theme.background.secondary
							: theme.colorScales[tone].muted
						: "transparent",
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			{icon ? (
				<Icon name={icon} tone={tone === "default" ? "secondary" : tone} />
			) : undefined}
			<Text
				style={{
					flex: 1,
					fontFamily: font.regular,
					fontSize: typography.label.fontSize,
					lineHeight: typography.label.lineHeight,
					color:
						tone === "default" ? theme.text.primary : theme[tone].foreground,
				}}
			>
				{label}
			</Text>
			{isSelected ? (
				<Icon name="check" tone={tone === "default" ? "primary" : tone} />
			) : undefined}
		</Pressable>
	);
};
