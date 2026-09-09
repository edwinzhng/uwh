import { useFocusEffect } from "expo-router";
import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from "react";
import Animated, { cubicBezier } from "react-native-reanimated";
import { pageMotionAllowed } from "./page-motion-input";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";

const reveal = { from: { opacity: 0.2 }, to: { opacity: 1 } };

export const PageReveal = ({
	children,
	fill = false,
	enabled = true,
	replayOnFocus = true,
}: {
	children: ReactNode;
	fill?: boolean;
	enabled?: boolean;
	replayOnFocus?: boolean;
}): ReactElement => {
	const motionEnabled = useMotion();
	const currentMotion = useRef(motionEnabled);
	currentMotion.current = motionEnabled;
	const [active, setActive] = useState(
		() => motionEnabled && pageMotionAllowed(),
	);
	useFocusEffect(
		useCallback(() => {
			if (!replayOnFocus) return;
			setActive(currentMotion.current && pageMotionAllowed());
			return (): void => setActive(false);
		}, [replayOnFocus]),
	);
	const animate = motionEnabled && active && enabled;
	return (
		<Animated.View
			style={{
				flex: fill ? 1 : undefined,
				minHeight: fill ? 0 : undefined,
				gap: fill ? space.md : space.xl,
				animationName: animate ? reveal : undefined,
				animationDuration: motion.duration.reveal,
				animationTimingFunction: cubicBezier(...motion.easing.out),
				animationIterationCount: 1,
			}}
		>
			{children}
		</Animated.View>
	);
};
