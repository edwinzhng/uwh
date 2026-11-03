import { type ReactElement, useLayoutEffect, useRef } from "react";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import type { SelectionIndicatorProps } from "./selection-indicator-props";
import { geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

export const SelectionIndicator = ({
	frame,
	value,
	color,
	radius,
	borderColor,
}: SelectionIndicatorProps): ReactElement => {
	const enabled = useMotion();
	const previous = useRef(value);
	const x = useSharedValue(frame.x);
	const width = useSharedValue(frame.width);
	useLayoutEffect((): void => {
		const animate = enabled && previous.current !== value;
		previous.current = value;
		const config = {
			duration: motion.duration.fast,
			easing: Easing.bezier(...motion.easing.out),
			reduceMotion: ReduceMotion.System,
		};
		x.set(animate ? withTiming(frame.x, config) : frame.x);
		width.set(animate ? withTiming(frame.width, config) : frame.width);
	}, [enabled, value, frame.x, frame.width, x, width]);
	const style = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }, { scaleX: width.get() / frame.width }],
	}));
	return (
		<Animated.View
			pointerEvents="none"
			accessible={false}
			style={[
				{
					position: "absolute",
					left: 0,
					top: frame.y,
					width: frame.width,
					height: frame.height,
					transformOrigin: "left center",
					borderRadius: radius,
					backgroundColor: color,
					borderWidth: borderColor ? geometry.border : 0,
					borderColor,
				},
				style,
			]}
		/>
	);
};
