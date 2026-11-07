import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "./theme";
import { WatercolorShader } from "./watercolor-shader";
export const ChatBackdrop = (): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{ overflow: "hidden", backgroundColor: theme.background.canvas },
			]}
		>
			<View
				style={[
					StyleSheet.absoluteFill,
					{ opacity: theme.mode === "dark" ? 0.38 : 0.2 },
				]}
			>
				<WatercolorShader category="sky" seed="chat-water" animated={false} />
			</View>
			<LinearGradient
				colors={
					theme.mode === "dark"
						? [
								"rgba(28, 114, 159, 0.40)",
								"rgba(20, 73, 115, 0.24)",
								"rgba(21, 107, 132, 0.34)",
							]
						: [
								"rgba(115, 235, 185, 0.42)",
								"rgba(246, 253, 250, 0.70)",
								"rgba(151, 185, 245, 0.42)",
							]
				}
				locations={[0, 0.5, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.9, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
};
