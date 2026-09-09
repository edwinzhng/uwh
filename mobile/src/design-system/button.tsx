import { type ReactElement, useState } from "react";
import { Text as NativeText, Pressable } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { Badge } from "./badge";
import { type ButtonVariant, buttonColors } from "./button-colors";
import { ButtonSpinner } from "./button-spinner";
import { Icon, type IconName } from "./icon";
import { useTheme } from "./theme";
import { control, corners, font, geometry, motion, space } from "./tokens";
import { useControlSize } from "./use-control-size";
import { useMotion } from "./use-motion";

type Props = {
	label: string;
	accessibilityLabel?: string;
	onPress: () => void;
	variant?: ButtonVariant;
	isDisabled?: boolean;
	isLoading?: boolean;
	isSelected?: boolean;
	testID?: string;
	staffRole?: "coach" | "admin";
} & (
	| { prefix?: IconName; icon?: undefined }
	| { icon: IconName; prefix?: undefined }
);
export const Button = ({
	label,
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
}: Props): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const controlSize = useControlSize();
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
			onPress={onPress}
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
					paddingHorizontal: icon ? space.none : control.paddingX,
					paddingVertical: control.paddingY,
					borderRadius: corners.control,
					borderWidth: geometry.border,
					borderColor: colors.border,
					outlineWidth: focused ? geometry.focus : 0,
					outlineOffset: geometry.focus,
					outlineColor: theme.focus,
					backgroundColor: colors.background,
					transform: [{ scale: pressed && canAnimate ? motion.pressScale : 1 }],
					transitionProperty: "transform",
					transitionDuration: canAnimate
						? motion.duration.fast
						: motion.duration.instant,
					transitionTimingFunction: cubicBezier(...motion.easing.out),
				}}
			>
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
	);
};
