import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { useReduceTransparency } from "./material-accessibility";
import { MaterialTexture } from "./material-texture";
import { type CategoryColor, corners } from "./tokens";

export const CardBackground = ({
	color,
	category,
	seed,
	radius = corners.panel,
}: {
	color: string;
	category?: CategoryColor;
	seed?: string;
	radius?: number;
}): ReactElement => {
	const reduced = useReduceTransparency();
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
					opacity: reduced ? 1 : 0.9,
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
