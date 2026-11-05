import { type ReactElement, useContext, useState } from "react";
import {
	Text as NativeText,
	Pressable,
	View,
	type ViewStyle,
} from "react-native";
import { Badge } from "./badge";
import { buttonColors } from "./button-colors";
import { activateButton } from "./button-feedback";
import type { ButtonProps } from "./button-props";
import { ButtonSpinner } from "./button-spinner";
import { FloatingControlContext } from "./floating-control-context";
import { useButtonHaptics } from "./haptics";
import { Icon } from "./icon";
import { roleGlow } from "./role-glow";
import { useRoleTone } from "./role-scope";
import { useTheme } from "./theme";
import { control, corners, font, geometry, space, typography } from "./tokens";
import { ToolbarHighlight } from "./toolbar-highlight";
import { useControlSize } from "./use-control-size";

export const ButtonControl = ({
	label,
	count,
	density = "standard",
	roleTone: explicitRole,
	validationError,
	onInvalid,
	leading,
	accessibilityLabel,
	onPress,
	prefix,
	icon,
	variant = "solid",
	isDisabled = false,
	isLoading = false,
	isSelected,
	testID,
	compact = false,
	round = false,
}: ButtonProps): ReactElement => {
	const theme = useTheme();
	const roleTone = useRoleTone(explicitRole);
	const floating = useContext(FloatingControlContext) && variant === "ghost";
	const [attempted, setAttempted] = useState(false);
	const haptic = useButtonHaptics();
	const defaultSize = useControlSize();
	const controlSize =
		compact && defaultSize < geometry.touch
			? geometry.compactControl
			: defaultSize;
	const [pressed, setPressed] = useState(false);
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const blocked = isDisabled || isLoading;
	const interaction = isDisabled
		? "disabled"
		: isLoading
			? "rest"
			: pressed
				? "pressed"
				: hovered
					? "hover"
					: "rest";
	const colors = buttonColors(
		theme,
		variant,
		floating && (interaction === "hover" || interaction === "pressed")
			? "rest"
			: interaction,
		Boolean(isSelected),
	);
	const glyph = icon ?? prefix;
	const filter = density === "filter";
	const faceSize = filter ? geometry.compactControl : controlSize;
	const textStyle = filter ? typography.small : control.typography;
	const faceStyle: ViewStyle = {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: control.gap,
		minHeight: faceSize,
		minWidth: icon ? controlSize : undefined,
		alignSelf: icon ? "center" : "stretch",
		paddingHorizontal: icon
			? count === undefined
				? space.none
				: space.xs
			: filter
				? space.md
				: compact
					? space.xs
					: control.paddingX,
		paddingVertical: compact || filter ? space.xxs : control.paddingY,
		borderRadius: round ? faceSize / 2 : corners.button,
		boxShadow:
			roleTone && !blocked ? roleGlow(roleTone, theme.mode) : undefined,
		borderWidth: geometry.border,
		borderColor: colors.border,
		outlineWidth: focused ? geometry.focus : 0,
		outlineOffset: geometry.focus,
		outlineColor: theme.focus,
		backgroundColor: colors.background,
	};
	return (
		<>
			<Pressable
				testID={testID}
				accessibilityRole="button"
				aria-pressed={isSelected}
				accessibilityLabel={accessibilityLabel ?? label}
				accessibilityHint={validationError}
				accessibilityState={{
					disabled: blocked,
					busy: isLoading,
					selected: isSelected,
				}}
				style={{
					alignSelf: icon ? "center" : undefined,
					minHeight: controlSize,
					minWidth: icon || compact ? controlSize : undefined,
					maxWidth: "100%",
					justifyContent: "center",
					alignItems: "center",
				}}
				disabled={blocked}
				onPress={(): void => {
					if (blocked) return;
					setPressed(false);
					setAttempted(false);
					activateButton(
						{ isDisabled, isLoading, validationError },
						onPress,
						haptic,
						(message): void => {
							if (onInvalid) onInvalid(message);
							else setAttempted(true);
						},
					);
				}}
				onPressIn={(): void => setPressed(!blocked)}
				onPressOut={(): void => setPressed(false)}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => {
					setFocused(false);
					setPressed(false);
				}}
				onHoverIn={(): void => setHovered(true)}
				onHoverOut={(): void => setHovered(false)}
			>
				<View style={faceStyle}>
					{floating ? (
						<ToolbarHighlight active={!blocked && (hovered || pressed)} />
					) : undefined}
					{leading}
					{isLoading ? (
						<ButtonSpinner color={colors.foreground} />
					) : glyph ? (
						<Icon
							name={glyph}
							size={icon ? "md" : "sm"}
							color={colors.foreground}
						/>
					) : undefined}
					{icon ? undefined : (
						<NativeText
							style={{
								fontFamily: font.medium,
								fontSize: textStyle.fontSize,
								lineHeight: textStyle.lineHeight,
								textAlign: "center",
								textAlignVertical: "center",
								includeFontPadding: false,
								color: colors.foreground,
								flexShrink: 1,
							}}
						>
							{label}
						</NativeText>
					)}
					{count !== undefined ? (
						<Badge label={String(count)} compact />
					) : undefined}
				</View>
			</Pressable>
			{attempted && validationError && !blocked ? (
				<NativeText
					accessibilityRole="alert"
					style={{
						color: theme.danger.foreground,
						fontFamily: font.regular,
						fontSize: typography.body.fontSize,
						lineHeight: typography.body.lineHeight,
					}}
				>
					{validationError}
				</NativeText>
			) : undefined}
		</>
	);
};
