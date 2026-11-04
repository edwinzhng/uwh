import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingBackdrop } from "./loading-backdrop";
import { MaterialTexture } from "./material-texture";
import { useTheme } from "./theme";
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
				<MaterialTexture
					category="sky"
					seed="chat-water"
					animated={false}
					rounded={false}
				/>
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
								"rgba(113, 204, 238, 0.32)",
								"rgba(190, 222, 246, 0.22)",
								"rgba(113, 210, 218, 0.28)",
							]
				}
				locations={[0, 0.5, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.9, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			<View style={[StyleSheet.absoluteFill, { opacity: 0.12 }]}>
				<LoadingBackdrop canvas="transparent" line={theme.text.secondary} />
			</View>
		</View>
	);
};
