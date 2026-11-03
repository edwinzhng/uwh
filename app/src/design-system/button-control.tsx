import { type ReactElement, useState } from "react";
import {
	Text as NativeText,
	Pressable,
	View,
	type ViewStyle,
} from "react-native";
import Animated, { type useAnimatedStyle } from "react-native-reanimated";
import { buttonColors } from "./button-colors";
import { activateButton, raisedButton } from "./button-feedback";
import type { ButtonProps } from "./button-props";
import { ButtonSpinner } from "./button-spinner";
import { useButtonHaptics } from "./haptics";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import {
	control,
	corners,
	elevation,
	font,
	geometry,
	space,
	typography,
} from "./tokens";
import { useControlSize } from "./use-control-size";

export const ButtonControl = ({
	feedback,
	label,
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
}: ButtonProps & {
	feedback?: {
		style: ReturnType<
			typeof useAnimatedStyle<{ transform: { translateY: number }[] }>
		>;
		onPressChange: (pressed: boolean) => void;
	};
}): ReactElement => {
	const theme = useTheme();
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
	const raised = raisedButton(variant);
	const depth = raised ? geometry.focus : space.none;
	const buttonRadius = round ? controlSize / 2 : corners.button;
	const updatePressed = (value: boolean): void => {
		feedback?.onPressChange(value);
		setPressed(value && !blocked);
	};

	const solid = variant === "solid";
	const interaction = isDisabled
		? "disabled"
		: isLoading
			? "rest"
			: pressed
				? "pressed"
				: hovered
					? "hover"
					: "rest";
	const colors = buttonColors(theme, variant, interaction);
	const glyph = icon ?? prefix;
	const faceStyle: ViewStyle = {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: control.gap,
		minHeight: controlSize - depth,
		marginBottom: depth,
		minWidth: icon ? controlSize : undefined,
		alignSelf: icon ? "center" : "stretch",
		paddingHorizontal:
			icon || variant === "danger-text" || variant === "ghost"
				? space.none
				: compact
					? space.xs
					: control.paddingX,
		paddingVertical: compact ? space.xxs : control.paddingY,
		borderRadius: buttonRadius,
		borderWidth: geometry.border,
		borderColor: colors.border,
		outlineWidth: focused ? geometry.focus : 0,
		outlineOffset: geometry.focus,
		outlineColor: theme.focus,
		backgroundColor: colors.background,
	};
	const faceContent = (
		<>
			{leading}
			{isLoading ? (
				<ButtonSpinner color={colors.foreground} />
			) : glyph ? (
				<Icon
					name={glyph}
					size={icon ? "md" : "sm"}
					tone={
						isDisabled
							? "secondary"
							: solid
								? "onAccent"
								: variant === "danger"
									? "onDanger"
									: variant === "ghost" && interaction === "rest"
										? "secondary"
										: "primary"
					}
				/>
			) : undefined}
			{icon ? undefined : (
				<NativeText
					style={{
						fontFamily: font.medium,
						fontSize: control.typography.fontSize,
						lineHeight: control.typography.lineHeight,
						textAlign: "center",
						textAlignVertical: "center",
						includeFontPadding: false,
						color: colors.foreground,
						textDecorationLine:
							hovered &&
							!blocked &&
							(variant === "ghost" || variant === "danger-text")
								? "underline"
								: "none",
						flexShrink: 1,
					}}
				>
					{label}
				</NativeText>
			)}
		</>
	);
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
					alignSelf: icon ? "flex-start" : undefined,
					minHeight: controlSize,
					minWidth: icon || compact ? controlSize : undefined,
					justifyContent: "center",
					alignItems: "center",
				}}
				disabled={blocked}
				onPress={(): void => {
					if (blocked) return;
					updatePressed(false);
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
				onPressIn={(): void => updatePressed(true)}
				onPressOut={(): void => updatePressed(false)}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => {
					setFocused(false);
					updatePressed(false);
				}}
				onHoverIn={(): void => setHovered(true)}
				onHoverOut={(): void => setHovered(false)}
			>
				{raised ? (
					<View
						pointerEvents="none"
						style={[
							{
								position: "absolute",
								top: depth,
								left: space.none,
								right: space.none,
								bottom: space.none,
								borderRadius: buttonRadius,
								backgroundColor: colors.base,
							},
							blocked || pressed ? elevation.none : elevation.raised,
						]}
					/>
				) : undefined}
				{feedback ? (
					<Animated.View style={[faceStyle, feedback.style]}>
						{faceContent}
					</Animated.View>
				) : (
					<View style={faceStyle}>{faceContent}</View>
				)}
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
