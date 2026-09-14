import { useIsFocused } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import Animated, { cubicBezier } from "react-native-reanimated";
import { pageMotionAllowed } from "./page-motion-input";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";

const reveal = { from: { opacity: 0 }, to: { opacity: 1 } };

export const PageReveal = ({
	children,
	fill = false,
	gap,
	enabled = true,
	replayOnFocus = true,
}: {
	children: ReactNode;
	fill?: boolean;
	gap?: "none";
	enabled?: boolean;
	replayOnFocus?: boolean;
}): ReactElement => {
	const motionEnabled = useMotion();
	const focused = useIsFocused();
	const animate =
		motionEnabled &&
		enabled &&
		pageMotionAllowed() &&
		(!replayOnFocus || focused);
	return (
		<Animated.View
			style={{
				flex: fill ? 1 : undefined,
				minHeight: fill ? 0 : undefined,
				gap: gap === "none" ? space.none : fill ? space.md : space.xl,
				animationName: animate ? reveal : undefined,
				animationDuration: motion.duration.slow,
				animationTimingFunction: cubicBezier(...motion.easing.out),
				animationFillMode: "backwards",
				animationIterationCount: 1,
			}}
		>
			{children}
		</Animated.View>
	);
};
