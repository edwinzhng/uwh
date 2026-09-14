import { type ReactElement, useEffect } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useTheme } from "./theme";
import { font, geometry, motion, typography } from "./tokens";
import { useMotion } from "./use-motion";

export const RollingDigit = ({ digit }: { digit: number }): ReactElement => {
	const theme = useTheme();
	const { fontScale } = useWindowDimensions();
	const canAnimate = useMotion();
	const height = typography.number.lineHeight * fontScale;
	const offset = useSharedValue(-digit * height);
	useEffect((): void => {
		offset.set(
			withTiming(-digit * height, {
				duration: canAnimate
					? motion.duration.standard
					: motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
	}, [digit, height, offset, canAnimate]);
	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: offset.get() }],
	}));
	return (
		<View
			style={{
				width: geometry.numberDigit * fontScale,
				height,
				overflow: "hidden",
			}}
		>
			<Animated.View style={style}>
				{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
					<Text
						key={number}
						allowFontScaling={false}
						style={{
							fontFamily: font.medium,
							fontSize: typography.number.fontSize * fontScale,
							lineHeight: height,
							height,
							color: theme.text.primary,
							textAlign: "center",
							fontVariant: ["tabular-nums"],
						}}
					>
						{number}
					</Text>
				))}
			</Animated.View>
		</View>
	);
};
