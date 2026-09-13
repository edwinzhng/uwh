import type { ReactElement } from "react";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useTheme } from "./theme";
import { corners, geometry, motion } from "./tokens";
import { useMotion } from "./use-motion";

type Props = { value: boolean; isFocused: boolean; isDisabled?: boolean };

export const SwitchTrack = ({
	value,
	isFocused,
	isDisabled,
}: Props): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const duration = canAnimate
		? motion.duration.standard
		: motion.duration.instant;
	const travel =
		geometry.switchWidth - geometry.switchThumb - geometry.switchInset * 2;
	return (
		<Animated.View
			key={theme.background.primary}
			pointerEvents="none"
			style={{
				width: geometry.switchWidth,
				height: geometry.switchHeight,
				borderRadius: corners.pill,
				backgroundColor: value ? theme.switchOn : theme.switchOff,
				borderWidth: geometry.border,
				borderColor: value ? theme.switchOn : theme.controlBorder,
				outlineWidth: isFocused ? geometry.focus : 0,
				outlineOffset: geometry.focus,
				outlineColor: theme.focus,
				opacity: isDisabled ? geometry.disabledOpacity : 1,
				transitionProperty: ["backgroundColor", "borderColor"],
				transitionDuration: duration,
				transitionTimingFunction: cubicBezier(...motion.easing.standard),
			}}
		>
			<Animated.View
				style={{
					position: "absolute",
					top: geometry.switchInset - geometry.border,
					left: geometry.switchInset - geometry.border,
					width: geometry.switchThumb,
					height: geometry.switchThumb,
					borderRadius: corners.pill,
					backgroundColor: value ? theme.switchThumbOn : theme.switchThumbOff,
					transform: [{ translateX: value ? travel : 0 }],
					transitionProperty: ["transform", "backgroundColor"],
					transitionDuration: duration,
					transitionTimingFunction: cubicBezier(...motion.easing.standard),
				}}
			/>
		</Animated.View>
	);
};
