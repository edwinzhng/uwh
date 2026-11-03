import { useAtomValue } from "jotai";
import { type ReactElement, useId } from "react";
import { StyleSheet, View } from "react-native";
import { cardMaterialImages } from "./card-material-images";
import { cardMaterialAtom } from "./card-material-preference";
import { MaterialLayers } from "./material-layers";
import { materialVariation } from "./material-variation";
import { useTheme } from "./theme";
import { type CategoryColor, corners, space } from "./tokens";

export const MaterialTexture = ({
	category,
	seed,
	animated = true,
	rounded = true,
	appearance,
}: {
	category: CategoryColor;
	seed?: string;
	animated?: boolean;
	rounded?: boolean;
	appearance?: "light" | "dark";
}): ReactElement | undefined => {
	const material = useAtomValue(cardMaterialAtom);
	const theme = useTheme();
	const instance = useId();
	const variation = materialVariation(`${seed ?? ""}:${instance}`);
	const images =
		cardMaterialImages[material][category][appearance ?? theme.mode];
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{ borderRadius: rounded ? corners.panel : 0, overflow: "hidden" },
			]}
		>
			<View style={styles.bleed}>
				<MaterialLayers
					images={images}
					variation={variation}
					animated={animated}
				/>
			</View>
		</View>
	);
};
const styles = StyleSheet.create({
	bleed: {
		position: "absolute",
		top: -space.sm,
		left: -space.sm,
		right: -space.sm,
		bottom: -space.sm,
	},
});
