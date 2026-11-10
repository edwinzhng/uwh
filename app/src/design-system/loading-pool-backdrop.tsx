import type { ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import {
	authBackdropPhoto,
	useAuthBackdropGeometry,
	useAuthBackdropPlacement,
} from "./auth-backdrop-geometry";
import { loadingColors } from "./loading-colors";

export const LoadingPoolBackdrop = ({
	contentTop,
}: {
	contentTop: number;
}): ReactElement => {
	const { scale } = useAuthBackdropGeometry();
	const placement = useAuthBackdropPlacement(scale, contentTop);
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{ backgroundColor: loadingColors.canvas, overflow: "hidden" },
			]}
		>
			<Image
				source={authBackdropPhoto.source}
				resizeMode="cover"
				accessibilityIgnoresInvertColors
				style={{ position: "absolute", ...placement }}
			/>
			<View
				style={[
					StyleSheet.absoluteFill,
					{
						backgroundColor: loadingColors.canvas,
						opacity: loadingColors.poolScrimOpacity,
					},
				]}
			/>
		</View>
	);
};
