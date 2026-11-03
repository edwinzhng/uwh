import { type ReactElement, useEffect } from "react";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { LoadingRevealProps } from "./loading-reveal-props";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";
export const LoadingReveal = ({
	ready,
	distance = 0,
	children,
	wordmark = false,
}: LoadingRevealProps): ReactElement => {
	const enabled = useMotion();
	const progress = useSharedValue(ready ? 1 : 0);
	useEffect((): void => {
		progress.set(
			withTiming(ready ? 1 : 0, {
				duration: enabled
					? wordmark
						? motion.duration.extended
						: motion.duration.slow
					: motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [ready, enabled, progress, wordmark]);
	const style = useAnimatedStyle(() => ({
		opacity: wordmark ? 1 - progress.get() * 0.1 : progress.get(),
		transform: [{ translateY: wordmark ? progress.get() * distance : 0 }],
	}));
	return <Animated.View style={style}>{children}</Animated.View>;
};
