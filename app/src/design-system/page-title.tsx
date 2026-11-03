import type { ReactElement } from "react";
import { View } from "react-native";

export const PageTitle = ({ title }: { title: string }): ReactElement => (
	<View
		accessible
		accessibilityRole="header"
		accessibilityLabel={title}
		style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
	/>
);
