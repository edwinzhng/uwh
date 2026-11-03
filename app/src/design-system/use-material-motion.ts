import { useContext } from "react";
import type { ViewStyle } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { CardMaterialContext } from "./card-material-context";
import { space } from "./tokens";
import { useScreenActive } from "./use-screen-active";

type MaterialMotionStyle = Pick<ViewStyle, "transform" | "opacity">;

export const useMaterialMotion = (
	variation: number,
	animated: boolean,
): {
	baseStyle: ReturnType<typeof useAnimatedStyle<MaterialMotionStyle>>;
	washStyle: ReturnType<typeof useAnimatedStyle<MaterialMotionStyle>>;
} => {
	const active = useScreenActive();
	const phase = useContext(CardMaterialContext);
	const playback = animated && active ? phase : undefined;
	const flipX = variation > 0.5 ? -1 : 1;
	const flipY = variation > 0.25 && variation < 0.75 ? -1 : 1;
	const baseStyle = useAnimatedStyle<MaterialMotionStyle>(() => ({
		transform: [
			{ scaleX: flipX * 1.16 },
			{ scaleY: flipY * 1.16 },
			{ translateX: ((playback?.get() ?? 0) + variation - 1) * space.xs },
		],
	}));
	const washStyle = useAnimatedStyle<MaterialMotionStyle>(() => {
		const position = ((playback?.get() ?? 0) + variation * 2) % 2;
		return {
			opacity: position > 1 ? 2 - position : position,
			transform: [
				{ scaleX: flipX * 1.16 },
				{ scaleY: flipY * 1.16 },
				{ translateY: (variation - (playback?.get() ?? 0)) * space.xs },
			],
		};
	});
	return { baseStyle, washStyle };
};
