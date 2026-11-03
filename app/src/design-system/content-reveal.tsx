import { type ReactElement, useMemo } from "react";
import Animated, {
	Easing,
	FadeIn,
	ReduceMotion,
} from "react-native-reanimated";
import type { ContentRevealProps } from "./reveal-props";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";

export const ContentReveal = ({
	children,
	enabled = true,
	fill = false,
	gap,
}: ContentRevealProps): ReactElement => {
	const canAnimate = useMotion();
	const entering = useMemo(
		() =>
			enabled && canAnimate
				? FadeIn.duration(motion.duration.slow)
						.easing(Easing.bezier(...motion.easing.out))
						.reduceMotion(ReduceMotion.System)
				: undefined,
		[enabled, canAnimate],
	);
	return (
		<Animated.View
			entering={entering}
			style={{
				minWidth: 0,
				gap: gap ? space[gap] : undefined,
				minHeight: fill ? 0 : undefined,
				flex: fill ? 1 : undefined,
			}}
		>
			{children}
		</Animated.View>
	);
};
