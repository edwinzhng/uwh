import type { ReactElement } from "react";
import { View } from "react-native";
import { hasUnread } from "./navigation-model";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const UnreadIndicator = ({
	count,
}: {
	count?: number;
}): ReactElement | undefined => {
	const theme = useTheme();
	if (!hasUnread(count)) return;
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{
				position: "absolute",
				right: -space.xxs,
				top: -space.half,
				width: space.xs,
				height: space.xs,
				borderRadius: corners.pill,
				backgroundColor: theme.navigation.unread,
				borderWidth: geometry.border,
				borderColor: theme.background.secondary,
			}}
		/>
	);
};
