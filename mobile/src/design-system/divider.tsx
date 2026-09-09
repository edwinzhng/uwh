import type { ReactElement } from "react";
import { View } from "react-native";
import { useTheme } from "./theme";
import { geometry } from "./tokens";

export const Divider = (): ReactElement => {
	const theme = useTheme();
	return (
		<View style={{ height: geometry.border, backgroundColor: theme.border }} />
	);
};
