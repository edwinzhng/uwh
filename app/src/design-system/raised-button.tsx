import type { ReactElement } from "react";
import {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { ButtonControl } from "./button-control";
import { buttonPressGeometry } from "./button-feedback";
import type { ButtonProps } from "./button-props";
import { geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

export const RaisedButton = (props: ButtonProps): ReactElement => {
	const canAnimate = useMotion();
	const blocked = props.isDisabled || props.isLoading;
	const progress = useSharedValue(0);
	const onPressChange = (pressed: boolean): void =>
		progress.set(
			pressed && canAnimate && !blocked
				? 1
				: withTiming(0, {
						duration: canAnimate
							? motion.duration.fast
							: motion.duration.instant,
						easing: Easing.bezier(...motion.easing.out),
						reduceMotion: ReduceMotion.System,
					}),
		);
	const style = useAnimatedStyle(() => ({
		transform: [
			{
				translateY: buttonPressGeometry(
					progress.get(),
					geometry.focus,
					canAnimate && !blocked,
				).travel,
			},
		],
	}));
	return <ButtonControl {...props} feedback={{ style, onPressChange }} />;
};
