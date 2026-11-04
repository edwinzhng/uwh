import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { space } from "./tokens";
export const HomeFitnessLayout = ({
	wide,
	children,
}: {
	wide: boolean;
	children: ReactNode;
}): ReactElement => (
	<View
		style={{
			flexDirection: wide ? "column" : "row",
			alignItems: wide ? "stretch" : "center",
			justifyContent: "space-between",
			gap: space.sm,
			minWidth: 0,
		}}
	>
		{children}
	</View>
);
