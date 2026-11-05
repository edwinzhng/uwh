import { type ReactElement, useCallback } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import type { ContentRevealProps } from "./reveal-props";
import { motion, space } from "./tokens";
import {
	useContentRevealEnvironment,
	useContentRevealPlayback,
} from "./use-content-reveal";

export const ContentReveal = ({
	children,
	enabled = true,
	delay = 0,
	fill = false,
	gap,
}: ContentRevealProps): ReactElement => {
	const environment = useContentRevealEnvironment(enabled);
	const opacity = useSharedValue(environment.eligible ? 0 : 1);
	const show = useCallback((): void => {
		cancelAnimation(opacity);
		opacity.set(1);
	}, [opacity]);
	const play = useCallback((): void => {
		opacity.set(0);
		opacity.set(
			withDelay(
				delay,
				withTiming(1, {
					duration: motion.duration.slow,
					easing: Easing.bezier(...motion.easing.out),
					reduceMotion: ReduceMotion.System,
				}),
				ReduceMotion.System,
			),
		);
	}, [opacity, delay]);
	useContentRevealPlayback(environment, play, show);
	const appearance = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return (
		<Animated.View
			style={[
				{
					minWidth: 0,
					gap: gap ? space[gap] : undefined,
					minHeight: fill ? 0 : undefined,
					flex: fill ? 1 : undefined,
				},
				appearance,
			]}
		>
			{children}
		</Animated.View>
	);
};
