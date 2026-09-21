import { type ReactElement, useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useTheme } from "./theme";
import { corners, geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

type Props = { label: string; value: number; max: number };
export const Progress = ({ label, value, max }: Props): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
	const progress = useSharedValue(percent);
	useEffect((): void => {
		progress.set(
			withTiming(percent, {
				duration: canAnimate ? motion.duration.slow : motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [canAnimate, percent, progress]);
	const progressStyle = useAnimatedStyle(() => ({
		width: `${progress.get()}%`,
	}));
	return (
		<View
			accessibilityRole="progressbar"
			accessibilityLabel={label}
			accessibilityValue={{ min: 0, max, now: value }}
			style={{
				height: geometry.progress,
				backgroundColor: theme.background.secondary,
				borderRadius: corners.pill,
				overflow: "hidden",
			}}
		>
			<Animated.View
				style={[
					{
						height: "100%",
						backgroundColor: theme.text.primary,
						borderRadius: corners.pill,
					},
					progressStyle,
				]}
			/>
		</View>
	);
};
