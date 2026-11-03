import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "./theme";

export const ChatBackground = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
			<View
				pointerEvents="none"
				accessible={false}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				style={[
					StyleSheet.absoluteFill,
					{ backgroundColor: theme.background.canvas, opacity: 0.94 },
				]}
			/>
			<LinearGradient
				pointerEvents="none"
				accessible={false}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				colors={
					theme.mode === "dark"
						? [
								"rgba(18, 67, 105, 0.20)",
								"rgba(23, 80, 116, 0.12)",
								"rgba(23, 80, 116, 0)",
							]
						: [
								"rgba(105, 188, 226, 0.16)",
								"rgba(161, 214, 237, 0.10)",
								"rgba(161, 214, 237, 0)",
							]
				}
				locations={[0, 0.5, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.9, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			{children}
		</View>
	);
};
