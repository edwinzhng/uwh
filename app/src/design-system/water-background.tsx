import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "./theme";

export const WaterBackground = (): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{
					backgroundColor:
						theme.background.primary === "#FFFFFF" ? "#f3f4f4" : "#151719",
				},
			]}
		/>
	);
};
