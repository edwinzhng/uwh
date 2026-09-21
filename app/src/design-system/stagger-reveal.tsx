import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { pageMotionAllowed } from "./page-motion-input";
import { staggerDelay } from "./stagger-policy";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";

export const StaggerReveal = ({
	children,
	index,
	enabled = true,
}: {
	children: ReactNode;
	index: number;
	enabled?: boolean;
}): ReactElement => {
	const motionEnabled = useMotion();
	const initialIndex = useRef(index).current;
	const delay = staggerDelay(initialIndex);
	const animate =
		enabled && motionEnabled && pageMotionAllowed() && delay !== undefined;
	const progress = useSharedValue(animate ? 0 : 1);
	useEffect(() => {
		progress.set(
			animate
				? withDelay(
						delay ?? 0,
						withTiming(1, {
							duration: motion.duration.slow,
							easing: Easing.bezier(...motion.easing.out),
						}),
					)
				: 1,
		);
		return (): void => {
			cancelAnimation(progress);
		};
	}, [animate, delay, progress]);
	const style = useAnimatedStyle(() => ({
		opacity: progress.get(),
		transform: [{ translateY: (1 - progress.get()) * space.xxs }],
	}));
	return <Animated.View style={style}>{children}</Animated.View>;
};
