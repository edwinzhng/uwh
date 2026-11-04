import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import artwork from "../../assets/lineup-pool.png";
import { useTheme } from "./theme";

export const LineupBackdrop = (): ReactElement => {
	const dark = useTheme().mode === "dark";
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
		>
			<Image
				source={artwork}
				resizeMode="cover"
				style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
			/>
			<LinearGradient
				colors={
					dark
						? ["rgba(9,22,24,0.68)", "rgba(9,22,24,0.78)"]
						: ["rgba(245,248,242,0.8)", "rgba(245,248,242,0.88)"]
				}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
};
