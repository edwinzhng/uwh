import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import type { MaterialLayersProps } from "./material-layers-props";
import { useMaterialMotion } from "./use-material-motion";

export const MaterialLayers = ({
	images,
	variation,
	animated,
}: MaterialLayersProps): ReactElement => {
	const { baseStyle, washStyle } = useMaterialMotion(variation, animated);
	return (
		<>
			<Animated.Image
				source={images[0]}
				resizeMode="stretch"
				fadeDuration={0}
				style={[styles.image, baseStyle]}
			/>
			<Animated.Image
				source={images[1]}
				resizeMode="stretch"
				fadeDuration={0}
				style={[styles.image, washStyle]}
			/>
		</>
	);
};
const styles = StyleSheet.create({
	image: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
	},
});
