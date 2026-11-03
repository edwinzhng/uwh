import { type ReactElement, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { InteractionHighlight } from "./interaction-highlight";
import { interactiveRow } from "./interactive-row-layout";
import type { PopupRowProps } from "./popup-row-props";
import { useTheme } from "./theme";
import { font, geometry, space, typography } from "./tokens";

export const PopupRow = ({
	label,
	icon,
	person,
	isSelected,
	isChecked,
	isDisabled,
	tone = "default",
	onSelect,
}: PopupRowProps): ReactElement => {
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	return (
		<Pressable
			accessibilityRole={
				isChecked !== undefined
					? "checkbox"
					: isSelected === undefined
						? "button"
						: "radio"
			}
			accessibilityLabel={label}
			aria-checked={isChecked ?? isSelected}
			aria-disabled={isDisabled}
			accessibilityState={{
				checked: isChecked ?? isSelected,
				disabled: isDisabled,
			}}
			disabled={isDisabled}
			onPress={onSelect}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={() => ({
				minHeight: interactiveRow.minHeight,
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				paddingHorizontal: interactiveRow.paddingHorizontal,
				paddingVertical: interactiveRow.paddingVertical,
				marginHorizontal: 0,
				borderRadius: interactiveRow.borderRadius,
				backgroundColor: "transparent",
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: interactiveRow.focusOffset,
			})}
		>
			{({ pressed }): ReactElement => (
				<>
					<InteractionHighlight
						active={
							!isDisabled &&
							Boolean(pressed || isSelected || isChecked || hovered || focused)
						}
						color={
							tone === "default"
								? theme.background.hover
								: theme.colorScales[tone].muted
						}
						radius={interactiveRow.borderRadius}
					/>
					{person ? (
						<Avatar name={person.name ?? label} personId={person.id} compact />
					) : icon ? (
						<Icon name={icon} tone={tone === "default" ? "secondary" : tone} />
					) : undefined}
					<Text
						style={{
							flex: 1,
							fontFamily: font.regular,
							fontSize: typography.label.fontSize,
							lineHeight: typography.label.lineHeight,
							color:
								tone === "default"
									? theme.text.primary
									: theme[tone].foreground,
						}}
					>
						{label}
					</Text>
					{isChecked !== undefined || isSelected !== undefined ? (
						<View style={{ width: geometry.icon, alignItems: "center" }}>
							{isChecked !== undefined ? (
								<Icon
									name={isChecked ? "checkboxChecked" : "stop"}
									tone={tone === "default" ? "primary" : tone}
								/>
							) : isSelected ? (
								<Icon
									name="check"
									tone={tone === "default" ? "primary" : tone}
								/>
							) : undefined}
						</View>
					) : undefined}
				</>
			)}
		</Pressable>
	);
};
