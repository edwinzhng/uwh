import { motionEffects } from "@uwhclub/design-system/tokens";
import {
	type ReactElement,
	type ReactNode,
	useCallback,
	useContext,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { loadingColors } from "./loading-colors";
import { LoadingLayer } from "./loading-layer";
import { LoadingScreen } from "./loading-screen";
import { LoadingCoveredContext } from "./loading-state";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";
export const LoadingHandoff = ({
	loading,
	children,
	keepMounted = false,
	fillViewport = false,
}: {
	loading: boolean;
	children: ReactNode | (() => ReactNode);
	keepMounted?: boolean;
	fillViewport?: boolean;
}): ReactElement => {
	const canAnimate = useMotion();
	const covered = useContext(LoadingCoveredContext);
	const [visible, setVisible] = useState(loading);
	const opacity = useSharedValue(loading ? 1 : 0);
	const generation = useRef(0);
	const finish = useCallback((version: number): void => {
		if (version === generation.current) setVisible(false);
	}, []);
	useLayoutEffect(() => {
		cancelAnimation(opacity);
		generation.current += 1;
		const version = generation.current;
		if (loading) {
			setVisible(true);
			opacity.set(1);
		} else if (covered || !canAnimate) {
			setVisible(false);
			opacity.set(0);
		} else
			opacity.set(
				withTiming(
					0,
					{
						duration: motionEffects.loadingHandoff,
						easing: Easing.bezier(...motion.easing["in-out"]),
						reduceMotion: ReduceMotion.System,
					},
					(finished): void => {
						if (finished) scheduleOnRN(finish, version);
					},
				),
			);
		return (): void => {
			generation.current += 1;
			cancelAnimation(opacity);
		};
	}, [loading, covered, canAnimate, opacity, finish]);
	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
	return (
		<View collapsable={false} style={{ flex: 1, minHeight: 0 }}>
			<LoadingCoveredContext value={covered || loading || visible}>
				{(!loading || keepMounted) &&
					(typeof children === "function" ? children() : children)}
			</LoadingCoveredContext>
			{!covered && (loading || visible) && (
				<LoadingLayer fillViewport={fillViewport}>
					<Animated.View
						style={[
							StyleSheet.absoluteFill,
							{
								backgroundColor: loadingColors.canvas,
								zIndex: 1,
								pointerEvents: "none",
							},
							style,
						]}
					>
						<LoadingScreen />
					</Animated.View>
				</LoadingLayer>
			)}
		</View>
	);
};
