import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { cardMaterialImages } from "./card-material-images";
import { cardMaterialAtom } from "./card-material-preference";
import { MaterialLayers } from "./material-layers";
import { materialVariation } from "./material-variation";
import { useTheme } from "./theme";
import { pageMaterialOpacity } from "./tokens";

export const PageMaterialBackground = (): ReactElement | undefined => {
	const theme = useTheme();
	const material = useAtomValue(cardMaterialAtom);

	return (
		<View
			nativeID="app-material-background"
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{ overflow: "hidden", opacity: pageMaterialOpacity[theme.mode] },
			]}
		>
			<MaterialLayers
				images={cardMaterialImages[material].fern[theme.mode]}
				variation={materialVariation("app-background")}
				animated
			/>
		</View>
	);
};
