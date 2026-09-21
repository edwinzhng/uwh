import { memo, type ReactElement, useEffect } from "react";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { GlassBackdrop } from "./glass-backdrop";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { corners, layer, motion } from "./tokens";
import { useMotion } from "./use-motion";

export type SegmentFrame = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type Props = {
	frame: SegmentFrame;
	isRound?: boolean;
	appearance?: "solid" | "glass" | "underline";
};

export const SegmentIndicator = memo(
	({ frame, isRound = false, appearance = "solid" }: Props): ReactElement => {
		const theme = useTheme();
		const glass = appearance === "glass";
		const canAnimate = useMotion();
		const x = useSharedValue(frame.x);
		const y = useSharedValue(frame.y);
		const width = useSharedValue(frame.width);
		const height = useSharedValue(frame.height);
		useEffect((): void => {
			const animation = {
				duration: canAnimate
					? motion.duration.standard
					: motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			};
			x.set(withTiming(frame.x, animation));
			y.set(withTiming(frame.y, animation));
			width.set(withTiming(frame.width, animation));
			height.set(withTiming(frame.height, animation));
		}, [canAnimate, frame, height, width, x, y]);
		const animatedFrame = useAnimatedStyle(() => ({
			width: width.get(),
			height: height.get(),
			transform: [{ translateX: x.get() }, { translateY: y.get() }],
		}));
		return (
			<Animated.View
				pointerEvents="none"
				accessible={false}
				style={[
					{
						position: "absolute",
						zIndex: layer.raised,
						left: 0,
						top: 0,
						backgroundColor: glass
							? "transparent"
							: appearance === "underline"
								? theme.text.primary
								: theme.background.selected,
						boxShadow: glass
							? materialColors(theme).selectionShadow
							: undefined,
						overflow: "hidden",
						borderRadius: isRound ? corners.pill : corners.control,
					},
					animatedFrame,
				]}
			>
				{glass ? <GlassBackdrop material="selection" /> : undefined}
			</Animated.View>
		);
	},
	(previous, next): boolean =>
		previous.isRound === next.isRound &&
		previous.appearance === next.appearance &&
		previous.frame.x === next.frame.x &&
		previous.frame.y === next.frame.y &&
		previous.frame.width === next.frame.width &&
		previous.frame.height === next.frame.height,
);
