import type { ReactElement } from "react";
import { View } from "react-native";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";

export const PoolAddGlyph = (): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			style={{
				width: geometry.icon,
				height: geometry.icon,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.pill,
				borderWidth: geometry.border,
				borderStyle: "dotted",
				borderColor: theme.controlBorder,
			}}
		>
			<Icon name="plus" size="sm" />
		</View>
	);
};
