import { LinearGradient } from "expo-linear-gradient";
import { type ReactElement, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { motionEffects } from "../../../packages/design-system/src/motion";
import artwork from "../../assets/lineup-pool.png";
import { useTheme } from "./theme";
import { motion, space } from "./tokens";
import { useMotion } from "./use-motion";
import { useScreenActive } from "./use-screen-active";

export const LineupBackdrop = ({
	active,
}: {
	active: boolean;
}): ReactElement => {
	const enabled = useMotion();
	const visible = useScreenActive();
	const dark = useTheme().mode === "dark";
	const phase = useSharedValue(0);
	useEffect((): (() => void) => {
		if (active && visible && enabled)
			phase.set(
				withRepeat(
					withTiming(phase.get() > 0.5 ? 0 : 1, {
						duration: motionEffects.cardMaterialFlow,
						easing: Easing.bezier(...motion.easing["in-out"]),
						reduceMotion: ReduceMotion.System,
					}),
					-1,
					true,
				),
			);
		else cancelAnimation(phase);
		return (): void => cancelAnimation(phase);
	}, [active, visible, enabled, phase]);
	const style = useAnimatedStyle(() => ({
		transform: [
			{ scale: 1.015 },
			{ translateX: (phase.get() - 0.5) * space.xs },
			{ translateY: (phase.get() - 0.5) * space.xxs },
		],
	}));
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
		>
			<Animated.Image
				source={artwork}
				resizeMode="stretch"
				blurRadius={0}
				style={[StyleSheet.absoluteFill, { opacity: 1 }, style]}
			/>
			<LinearGradient
				colors={
					dark
						? ["rgba(9,22,24,0.58)", "rgba(9,22,24,0.68)"]
						: ["rgba(245,248,242,0.58)", "rgba(245,248,242,0.72)"]
				}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
};
