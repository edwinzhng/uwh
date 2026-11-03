import { type ReactElement, useEffect, useRef } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import type { NotificationMotionProps } from "./notification-motion-props";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";
export const NotificationMotion = ({
	count,
	kind,
	children,
}: NotificationMotionProps): ReactElement => {
	const enabled = useMotion();
	const previous = useRef(count);
	const value = useSharedValue(0);
	useEffect(() => {
		const old = previous.current;
		previous.current = count;
		cancelAnimation(value);
		value.set(0);
		if (!enabled || old === count || (kind === "bell" && count < old)) return;
		const config = {
			duration: motion.duration.fast,
			easing: Easing.bezier(...motion.easing.out),
			reduceMotion: ReduceMotion.System,
		};
		if (kind === "bell") {
			const angle = Math.min(24, 10 + (count - old) * 2);
			value.set(
				withSequence(
					withTiming(angle, config),
					withTiming(-angle * 0.65, config),
					withTiming(angle * 0.3, config),
					withTiming(0, config),
				),
			);
		} else {
			value.set(count > old ? 8 : -8);
			value.set(withTiming(0, config));
		}
		return (): void => cancelAnimation(value);
	}, [count, kind, enabled, value]);
	const style = useAnimatedStyle(() => ({
		transform:
			kind === "bell"
				? [{ rotate: `${value.get()}deg` }]
				: [{ translateY: value.get() }],
	}));
	return (
		<Animated.View
			style={[
				{
					alignItems: "center",
					justifyContent: "center",
					transformOrigin: "50% 15%",
				},
				style,
			]}
		>
			{children}
		</Animated.View>
	);
};
