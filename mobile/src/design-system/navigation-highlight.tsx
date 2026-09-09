import { BlurView } from "expo-blur";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const NavigationHighlight = (): ReactElement => {
	const light = useTheme().background.primary === "#FFFFFF";
	return (
		<BlurView
			pointerEvents="none"
			intensity={15}
			tint={light ? "light" : "dark"}
			style={[
				StyleSheet.absoluteFill,
				{
					boxShadow: light
						? "0 3px 9px rgba(25,45,40,0.14)"
						: "0 2px 5px rgba(0,0,0,0.18)",
					borderRadius: corners.item,
					overflow: "hidden",
					borderWidth: geometry.border,
					borderColor: light ? "rgba(40,65,60,0.2)" : "rgba(255,255,255,0.18)",
					backgroundColor: light
						? "rgba(255,255,255,0.38)"
						: "rgba(255,255,255,0.08)",
				},
			]}
		/>
	);
};
