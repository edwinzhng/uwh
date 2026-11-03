import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const CardAtmosphere = (): ReactElement => {
	const theme = useTheme();
	return (
		<LinearGradient
			pointerEvents="none"
			accessible={false}
			colors={
				theme.mode === "dark"
					? ["rgba(210,251,98,0.025)", "rgba(210,251,98,0)"]
					: ["rgba(86,110,38,0.02)", "rgba(86,110,38,0)"]
			}
			start={{ x: 1, y: 0 }}
			end={{ x: 0, y: 0.8 }}
			style={[
				StyleSheet.absoluteFill,
				{
					borderRadius: Math.max(0, corners.panel - geometry.border),
					overflow: "hidden",
				},
			]}
		/>
	);
};
