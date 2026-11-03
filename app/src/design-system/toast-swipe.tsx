import { type ReactElement, type ReactNode, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toastSwipeDirection } from "./toast-swipe-motion";
import { geometry, motion, space } from "./tokens";
import { useMotion } from "./use-motion";

export const ToastSwipe = ({
	children,
	onDismiss,
}: {
	children: ReactNode;
	onDismiss: () => void;
}): ReactElement => {
	const animate = useMotion();
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const height = useSharedValue<number>(geometry.touch);
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const dismissing = useSharedValue(false);
	const gesture = useMemo(() => {
		const timing = {
			duration: animate ? motion.duration.fast : motion.duration.instant,
			easing: Easing.bezier(...motion.easing.out),
			reduceMotion: ReduceMotion.System,
		};
		return Gesture.Pan()
			.minDistance(space.xs)
			.maxPointers(1)
			.onStart((): void => {
				if (dismissing.get()) return;
				cancelAnimation(x);
				cancelAnimation(y);
			})
			.onUpdate((event): void => {
				if (dismissing.get()) return;
				x.set(event.translationX);
				y.set(Math.max(0, event.translationY));
			})
			.onEnd((event): void => {
				if (dismissing.get()) return;
				const direction = toastSwipeDirection(event);
				if (!direction) return;
				dismissing.set(true);
				if (!animate) {
					runOnJS(onDismiss)();
					return;
				}
				if (direction === "bottom")
					y.set(
						withTiming(
							height.get() + insets.bottom + space.md * 2,
							timing,
							(finished): void => {
								if (finished) runOnJS(onDismiss)();
							},
						),
					);
				else
					x.set(
						withTiming(
							(direction === "left" ? -1 : 1) * (width + space.md),
							timing,
							(finished): void => {
								if (finished) runOnJS(onDismiss)();
							},
						),
					);
			})
			.onFinalize((): void => {
				if (dismissing.get()) return;
				x.set(withTiming(0, timing));
				y.set(withTiming(0, timing));
			});
	}, [animate, dismissing, height, insets.bottom, onDismiss, width, x, y]);
	const style = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }, { translateY: y.get() }],
	}));
	return (
		<GestureDetector gesture={gesture}>
			<Animated.View
				collapsable={false}
				onLayout={(event): void => height.set(event.nativeEvent.layout.height)}
				style={style}
			>
				{children}
			</Animated.View>
		</GestureDetector>
	);
};
