import { type ReactElement, type ReactNode, useState } from "react";
import { Text as NativeText, Pressable } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { Badge } from "./badge";
import { type ButtonVariant, buttonColors } from "./button-colors";
import { ButtonSpinner } from "./button-spinner";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import {
	control,
	corners,
	font,
	geometry,
	motion,
	space,
	typography,
} from "./tokens";
import { useControlSize } from "./use-control-size";
import { useMotion } from "./use-motion";

type Props = {
	label: string;
	validationError?: string;
	leading?: ReactNode;
	accessibilityLabel?: string;
	onPress: () => void;
	variant?: ButtonVariant;
	isDisabled?: boolean;
	isLoading?: boolean;
	isSelected?: boolean;
	testID?: string;
	staffRole?: "coach" | "admin";
	compact?: boolean;
} & (
	| { prefix?: IconName; icon?: undefined }
	| { icon: IconName; prefix?: undefined }
);
export const Button = ({
	label,
	validationError,
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
	staffRole,
	compact = false,
}: Props): ReactElement => {
	const theme = useTheme();
	const [attempted, setAttempted] = useState(false);
	const canAnimate = useMotion();
	const defaultSize = useControlSize();
	const controlSize =
		compact && defaultSize < geometry.touch
			? geometry.compactControl
			: defaultSize;
	const [pressed, setPressed] = useState(false);
	const [focused, setFocused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const solid = variant === "solid";
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
	const colors = buttonColors(theme, variant, interaction);
	const glyph = icon ?? prefix;
	return (
		<>
			<Pressable
				testID={testID}
				accessibilityRole="button"
				accessibilityLabel={
					accessibilityLabel ??
					(staffRole ? `${label}, ${staffRole} action` : label)
				}
				accessibilityState={{
					disabled: blocked,
					busy: isLoading,
					selected: isSelected,
				}}
				style={{
					minHeight: controlSize,
					minWidth: icon ? controlSize : undefined,
					justifyContent: "center",
					alignItems: "center",
				}}
				disabled={blocked}
				onPress={(): void => {
					setAttempted(Boolean(validationError));
					if (!validationError) onPress();
				}}
				onPressIn={(): void => setPressed(true)}
				onPressOut={(): void => setPressed(false)}
				onFocus={(): void => setFocused(true)}
				onBlur={(): void => setFocused(false)}
				onHoverIn={(): void => setHovered(true)}
				onHoverOut={(): void => setHovered(false)}
			>
				<Animated.View
					style={{
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: control.gap,
						minHeight: controlSize,
						minWidth: icon ? controlSize : undefined,
						alignSelf: icon ? "center" : "stretch",
						paddingHorizontal:
							icon || variant === "danger-text" || variant === "ghost"
								? space.none
								: control.paddingX,
						paddingVertical: compact ? space.xxs : control.paddingY,
						borderRadius: corners.control,
						borderWidth: geometry.border,
						borderColor: colors.border,
						outlineWidth: focused ? geometry.focus : 0,
						outlineOffset: geometry.focus,
						outlineColor: theme.focus,
						backgroundColor: colors.background,
						transform: [
							{ scale: pressed && canAnimate ? motion.pressScale : 1 },
						],
						transitionProperty: "transform",
						transitionDuration: canAnimate
							? motion.duration.fast
							: motion.duration.instant,
						transitionTimingFunction: cubicBezier(...motion.easing.out),
					}}
				>
					{leading}
					{isLoading ? (
						<ButtonSpinner color={colors.foreground} />
					) : glyph ? (
						<Icon
							name={glyph}
							size="sm"
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
					{staffRole && !icon ? (
						<Badge
							label={staffRole === "coach" ? "Coach" : "Admin"}
							kind={staffRole}
							compact
						/>
					) : undefined}
				</Animated.View>
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
