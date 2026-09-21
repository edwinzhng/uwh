import { useFocusEffect } from "expo-router";
import {
	createContext,
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useLayoutEffect,
	useRef,
} from "react";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { pageMotionAllowed } from "./page-motion-input";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";

const PageRevealContext = createContext(false);

export const PageReveal = ({
	children,
	fill = false,
	gap,
	enabled = true,
	replayOnFocus = true,
	replayKey,
	animateOnMount = false,
}: {
	children: ReactNode;
	fill?: boolean;
	gap?: "none";
	enabled?: boolean;
	replayOnFocus?: boolean;
	replayKey?: string;
	animateOnMount?: boolean;
}): ReactElement => {
	const motionEnabled = useMotion();
	const nested = useContext(PageRevealContext);
	const previousKey = useRef(replayKey);
	const animate = motionEnabled && enabled && pageMotionAllowed();
	const opacity = useSharedValue(
		animate && (!nested || animateOnMount) ? 0 : 1,
	);
	const reveal = useCallback((): void => {
		cancelAnimation(opacity);
		if (!animate) {
			opacity.set(1);
			return;
		}
		opacity.set(0);
		opacity.set(
			withTiming(1, {
				duration: motion.duration.slow,
				easing: Easing.bezier(...motion.easing.out),
			}),
		);
	}, [animate, opacity]);
	useFocusEffect(
		useCallback(() => {
			if (!replayOnFocus) return;
			reveal();
			return (): void => {
				cancelAnimation(opacity);
			};
		}, [replayOnFocus, reveal, opacity]),
	);
	useLayoutEffect(() => {
		if (replayOnFocus) return;
		const changed = previousKey.current !== replayKey;
		previousKey.current = replayKey;
		if (!nested || animateOnMount || changed) reveal();
		else opacity.set(1);
		return (): void => {
			cancelAnimation(opacity);
		};
	}, [replayKey, replayOnFocus, nested, animateOnMount, reveal, opacity]);
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
