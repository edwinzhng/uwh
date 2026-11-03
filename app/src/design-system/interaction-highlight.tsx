import { type ReactElement, useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";

export const InteractionHighlight = ({
	active,
	color,
	radius,
}: {
	active: boolean;
	color: string;
	radius: number;
}): ReactElement => {
	const animate = useMotion();
	const progress = useSharedValue(active ? 1 : 0);
	useEffect((): void => {
		progress.set(
			withTiming(active ? 1 : 0, {
				duration: animate ? motion.duration.fast : motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [active, animate, progress]);
	const style = useAnimatedStyle(() => ({
		opacity: progress.get(),
		transform: [{ scale: animate ? 0.97 + progress.get() * 0.03 : 1 }],
	}));
	return (
		<Animated.View
			pointerEvents="none"
			accessible={false}
			style={[
				StyleSheet.absoluteFill,
				{ backgroundColor: color, borderRadius: radius },
				style,
			]}
		/>
	);
};
