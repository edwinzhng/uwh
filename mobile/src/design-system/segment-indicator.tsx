import { memo, type ReactElement } from "react";
import Animated, { cubicBezier } from "react-native-reanimated";
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
	appearance?: "solid" | "glass";
};

export const SegmentIndicator = memo(
	({ frame, isRound = false, appearance = "solid" }: Props): ReactElement => {
		const theme = useTheme();
		const glass = appearance === "glass";
		const canAnimate = useMotion();
		return (
			<Animated.View
				pointerEvents="none"
				accessible={false}
				style={{
					position: "absolute",
					zIndex: layer.raised,
					left: 0,
					top: 0,
					width: frame.width,
					height: frame.height,
					transform: [{ translateX: frame.x }, { translateY: frame.y }],
					backgroundColor: glass ? "transparent" : theme.background.selected,
					boxShadow: glass ? materialColors(theme).selectionShadow : undefined,
					overflow: "hidden",
					borderRadius: isRound ? corners.pill : corners.control,
					transitionProperty: ["transform", "width", "height"],
					transitionDuration: canAnimate
						? motion.duration.toggle
						: motion.duration.instant,
					transitionTimingFunction: cubicBezier(...motion.easing.control),
				}}
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
