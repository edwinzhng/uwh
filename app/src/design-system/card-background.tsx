import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialTexture } from "./material-texture";
import { type CategoryColor, corners, geometry } from "./tokens";

export const CardBackground = ({
	color,
	category,
	seed,
	radius = Math.max(0, corners.panel - geometry.border),
}: {
	color: string;
	category?: CategoryColor;
	seed?: string;
	radius?: number;
}): ReactElement => {
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{
					backgroundColor: color,
					borderRadius: radius,
					overflow: "hidden",
				},
			]}
		>
			{category ? (
				<MaterialTexture category={category} seed={seed} rounded={false} />
			) : undefined}
		</View>
	);
};
