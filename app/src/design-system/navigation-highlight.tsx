import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "./theme";
import { corners } from "./tokens";

export const NavigationHighlight = (): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{
					borderRadius: corners.navigation,
					backgroundColor: theme.background.selected,
				},
			]}
		/>
	);
};
