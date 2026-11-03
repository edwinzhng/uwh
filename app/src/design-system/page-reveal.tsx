import {
	type ReactElement,
	useCallback,
	useContext,
	useLayoutEffect,
} from "react";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { pageMotionAllowed } from "./page-motion-input";
import { PageRevealContext } from "./page-reveal-context";
import type { PageRevealProps } from "./reveal-props";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";
import { usePageReveal } from "./use-page-reveal";

export const PageReveal = ({
	children,
	fill = false,
	gap,
	enabled = true,
	replayOnFocus = true,
	replayKey,
}: PageRevealProps): ReactElement => {
	const motionEnabled = useMotion();
	const nested = useContext(PageRevealContext);
	const animate =
		motionEnabled &&
		enabled &&
		(!nested || !replayOnFocus) &&
		pageMotionAllowed();
	const opacity = useSharedValue(animate && !nested ? 0 : 1);
	const reveal = useCallback((): void => {
		cancelAnimation(opacity);
		if (!animate) {
			opacity.set(1);
			return;
		}
		if (opacity.get() === 1) opacity.set(0);
		opacity.set(
			withTiming(1, {
				duration: motion.duration.slow,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [animate, opacity]);
	const stop = useCallback((): void => {
		cancelAnimation(opacity);
		opacity.set(1);
	}, [opacity]);
	usePageReveal({ replayOnFocus, replayKey, nested, reveal, stop });
	useLayoutEffect((): void => {
		if (!animate) stop();
	}, [animate, stop]);
	const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return (
		<PageRevealContext.Provider value={true}>
			<Animated.View
				style={[
					{
						flex: fill ? 1 : undefined,
						minHeight: fill ? 0 : undefined,
						gap: gap === "none" ? space.none : fill ? space.md : space.xl,
					},
					animatedStyle,
				]}
			>
				{children}
			</Animated.View>
		</PageRevealContext.Provider>
	);
};
