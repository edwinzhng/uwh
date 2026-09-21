import { type ReactElement, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, motion, space, typography } from "./tokens";
import { useMotion } from "./use-motion";

const codeLength = 6;
const slotSize = geometry.control;
const slotGap = space.xs;
const caretHeight = typography.body.lineHeight;
const slots = ["first", "second", "third", "fourth", "fifth", "sixth"] as const;

type Status = "idle" | "success" | "error";
type Props = {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	onComplete?: (value: string) => void;
	status?: Status;
	hint?: string;
	error?: string;
	isDisabled?: boolean;
	autoFocus?: boolean;
};

const OtpDigit = ({ value }: { value: string }): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const offset = useSharedValue<number>(typography.h3.lineHeight);
	const opacity = useSharedValue(0);
	useEffect((): void => {
		const duration = canAnimate
			? motion.duration.standard
			: motion.duration.instant;
		offset.set(
			withTiming(0, {
				duration,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
		opacity.set(
			withTiming(1, {
				duration,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [canAnimate, offset, opacity]);
	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ translateY: offset.get() }],
	}));
	return (
		<Animated.Text
			allowFontScaling={false}
			style={[
				{
					color: theme.text.primary,
					fontFamily: font.semibold,
					fontSize: typography.h3.fontSize,
					lineHeight: typography.h3.lineHeight,
					fontVariant: ["tabular-nums"],
				},
				style,
			]}
		>
			{value}
		</Animated.Text>
	);
};

export const OtpInput = ({
	label,
	value,
	onValueChange,
	onComplete,
	status = "idle",
	hint,
	error,
	isDisabled,
	autoFocus,
}: Props): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const input = useRef<TextInput>(null);
	const [focused, setFocused] = useState(false);
	const [selection, setSelection] = useState(value.length);
	const caret = useSharedValue(0);
	const shake = useSharedValue(0);
	const activeIndex = Math.min(selection, codeLength - 1);
	useEffect((): void => {
		caret.set(
			withTiming(activeIndex * (slotSize + slotGap), {
				duration: canAnimate
					? motion.duration.standard
					: motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [activeIndex, canAnimate, caret]);
	useEffect((): void => {
		if (status !== "error") return;
		const timing = {
			duration: canAnimate ? motion.duration.fast : motion.duration.instant,
			easing: Easing.bezier(...motion.easing.out),
			reduceMotion: ReduceMotion.System,
		};
		shake.set(
			withSequence(
				withTiming(-space.half, timing),
				withTiming(space.half, timing),
				withTiming(0, timing),
			),
		);
	}, [canAnimate, shake, status]);
	const caretStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: caret.get() }],
	}));
	const rowStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shake.get() }],
	}));
	const statusColor =
		status === "error"
			? theme.danger.foreground
			: status === "success"
				? theme.success.foreground
				: undefined;
	return (
		<Stack gap="xs">
			<Text variant="caption">{label}</Text>
			<Pressable
				accessibilityRole="none"
				onPress={(): void => input.current?.focus()}
				style={{ alignSelf: "flex-start", maxWidth: "100%" }}
			>
				<Animated.View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					aria-hidden
					style={[
						{
							flexDirection: "row",
							gap: slotGap,
							opacity: isDisabled ? geometry.disabledOpacity : 1,
						},
						rowStyle,
					]}
				>
					{slots.map((slot, index) => {
						const digit = value.at(index);
						const active = focused && index === activeIndex;
						return (
							<View
								key={slot}
								style={{
									width: slotSize,
									height: slotSize,
									alignItems: "center",
									justifyContent: "center",
									overflow: "hidden",
									borderWidth: active ? geometry.focus : geometry.border,
									borderColor:
										statusColor ?? (active ? theme.focus : theme.border),
									borderRadius: corners.control,
									backgroundColor: theme.background.primary,
								}}
							>
								{digit ? <OtpDigit key={digit} value={digit} /> : undefined}
							</View>
						);
					})}
					{focused && value.length < codeLength ? (
						<Animated.View
							style={[
								{
									position: "absolute",
									left: 0,
									top: 0,
									width: slotSize,
									height: slotSize,
									alignItems: "center",
									justifyContent: "center",
									transform: [{ translateY: geometry.focus }],
								},
								caretStyle,
							]}
						>
							<View
								style={{
									width: geometry.focus,
									height: caretHeight,
									borderRadius: corners.pill,
									backgroundColor: theme.focus,
								}}
							/>
						</Animated.View>
					) : undefined}
				</Animated.View>
				<TextInput
					ref={input}
					accessibilityLabel={label}
					accessibilityHint={error ?? hint}
					accessibilityState={{ disabled: isDisabled }}
					aria-invalid={Boolean(error)}
					value={value}
					selection={{ start: selection, end: selection }}
					maxLength={codeLength}
					inputMode="numeric"
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					autoComplete="one-time-code"
					autoFocus={autoFocus}
					editable={!isDisabled}
					caretHidden
					onFocus={(): void => setFocused(true)}
					onBlur={(): void => setFocused(false)}
					onSelectionChange={(event): void =>
						setSelection(
							Math.min(event.nativeEvent.selection.start, value.length),
						)
					}
					onChangeText={(next): void => {
						const digits = next.replace(/\D/g, "").slice(0, codeLength);
						setSelection(digits.length);
						onValueChange(digits);
						if (digits.length === codeLength && digits !== value) {
							onComplete?.(digits);
						}
					}}
					style={{ position: "absolute", inset: 0, opacity: 0 }}
				/>
			</Pressable>
			{error || hint ? (
				<Text variant="caption" tone={error ? "danger" : "secondary"}>
					{error ?? hint}
				</Text>
			) : undefined}
		</Stack>
	);
};
