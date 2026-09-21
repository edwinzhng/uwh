import { type ReactElement, useEffect } from "react";
import Animated, {
	Easing,
	interpolateColor,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useTheme } from "./theme";
import { corners, geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

type Props = { value: boolean; isFocused: boolean; isDisabled?: boolean };

export const SwitchTrack = ({
	value,
	isFocused,
	isDisabled,
}: Props): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const duration = canAnimate
		? motion.duration.standard
		: motion.duration.instant;
	const travel =
		geometry.switchWidth - geometry.switchThumb - geometry.switchInset * 2;
	const progress = useSharedValue(value ? 1 : 0);
	useEffect((): void => {
		progress.set(
			withTiming(value ? 1 : 0, {
				duration,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [duration, progress, value]);
	const trackStyle = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(
			progress.get(),
			[0, 1],
			[theme.switchOff, theme.switchOn],
		),
		borderColor: interpolateColor(
			progress.get(),
			[0, 1],
			[theme.controlBorder, theme.switchOn],
		),
	}));
	const thumbStyle = useAnimatedStyle(() => ({
		backgroundColor: interpolateColor(
			progress.get(),
			[0, 1],
			[theme.switchThumbOff, theme.switchThumbOn],
		),
		transform: [{ translateX: progress.get() * travel }],
	}));
	return (
		<Animated.View
			key={theme.background.primary}
			pointerEvents="none"
			style={[
				{
					width: geometry.switchWidth,
					height: geometry.switchHeight,
					borderRadius: corners.pill,
					borderWidth: geometry.border,
					outlineWidth: isFocused ? geometry.focus : 0,
					outlineOffset: geometry.focus,
					outlineColor: theme.focus,
					opacity: isDisabled ? geometry.disabledOpacity : 1,
				},
				trackStyle,
			]}
		>
			<Animated.View
				style={[
					{
						position: "absolute",
						top: geometry.switchInset - geometry.border,
						left: geometry.switchInset - geometry.border,
						width: geometry.switchThumb,
						height: geometry.switchThumb,
						borderRadius: corners.pill,
					},
					thumbStyle,
				]}
			/>
		</Animated.View>
	);
};
