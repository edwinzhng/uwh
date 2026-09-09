import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./theme";

export const WaterBackground = (): ReactElement => {
	const light = useTheme().background.primary === "#FFFFFF";
	return (
		<LinearGradient
			pointerEvents="none"
			colors={
				light
					? ["#DBE5EC", "#F1F4F3", "#D6E4DF"]
					: ["#293137", "#171D20", "#293330"]
			}
			start={{ x: 1, y: 0 }}
			end={{ x: 0, y: 1 }}
			style={StyleSheet.absoluteFill}
		/>
	);
};
