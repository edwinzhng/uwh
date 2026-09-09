import type { ReactElement } from "react";
import { View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useTheme } from "./theme";
import { corners, geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

type Props = { label: string; value: number; max: number };
export const Progress = ({ label, value, max }: Props): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
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
				style={{
					height: "100%",
					width: `${percent}%`,
					backgroundColor: theme.text.primary,
					borderRadius: corners.pill,
					transitionProperty: "width",
					transitionDuration: canAnimate
						? motion.duration.slow
						: motion.duration.instant,
					transitionTimingFunction: cubicBezier(...motion.easing.control),
				}}
			/>
		</View>
	);
};
