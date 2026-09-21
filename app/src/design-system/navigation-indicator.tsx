import type { ReactElement } from "react";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { GlassBackdrop } from "./glass-backdrop";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { corners, layer, space } from "./tokens";

export const NavigationIndicator = ({
	position,
	itemWidth,
	barHeight,
}: {
	position: SharedValue<number>;
	itemWidth: SharedValue<number>;
	barHeight: SharedValue<number>;
}): ReactElement => {
	const colors = materialColors(useTheme());
	const frame = useAnimatedStyle(() => ({
		width: Math.max(0, itemWidth.get() - space.xxs * 2),
		height: Math.max(0, barHeight.get() - space.xxs * 2),
		transform: [
			{ translateX: position.get() * itemWidth.get() + space.xxs },
			{ translateY: space.xxs },
		],
	}));
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					position: "absolute",
					zIndex: layer.raised,
					left: 0,
					top: 0,
					backgroundColor: "transparent",
					boxShadow: colors.selectionShadow,
					overflow: "hidden",
					borderRadius: corners.control,
				},
				frame,
			]}
		>
			<GlassBackdrop material="selection" />
		</Animated.View>
	);
};
