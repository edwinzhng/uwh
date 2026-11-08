import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";

export const HomeCardEditPreview = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => (
	<View
		pointerEvents="none"
		aria-hidden
		importantForAccessibility="no-hide-descendants"
	>
		{children}
	</View>
);
