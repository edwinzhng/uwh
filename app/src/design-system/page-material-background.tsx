import { LinearGradient } from "expo-linear-gradient";
import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { cardMaterialImages } from "./card-material-images";
import { cardMaterialAtom } from "./card-material-preference";
import { LoadingBackdrop } from "./loading-backdrop";
import { MaterialLayers } from "./material-layers";
import { materialVariation } from "./material-variation";
import { useTheme } from "./theme";
import { pageMaterialOpacity } from "./tokens";

export const PageMaterialBackground = (): ReactElement | undefined => {
	const theme = useTheme();
	const material = useAtomValue(cardMaterialAtom);

	return (
		<>
			<View
				style={[StyleSheet.absoluteFill, { opacity: 0.16 }]}
				pointerEvents="none"
				accessible={false}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
			>
				<LoadingBackdrop canvas="transparent" line={theme.border} />
			</View>
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
					animated={false}
					images={cardMaterialImages[material].fern[theme.mode]}
					variation={materialVariation("app-background")}
				/>
			</View>
			<LinearGradient
				pointerEvents="none"
				accessible={false}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				colors={[
					`${theme.background.primary}00`,
					`${theme.background.primary}80`,
					theme.background.primary,
				]}
				locations={[0, 0.55, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.85, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
		</>
	);
};
