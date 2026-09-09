import type { ReactElement } from "react";
import { View } from "react-native";
import { NavigationControl, type NavigationItem } from "./navigation-control";
import { space } from "./tokens";

export const SidebarNavigation = ({
	navigation,
}: {
	navigation: NavigationItem[];
}): ReactElement => (
	<View
		accessibilityRole="tablist"
		accessibilityLabel="Main navigation"
		style={{ gap: space.xxs }}
	>
		{navigation.map((item) => (
			<NavigationControl key={item.label} item={item} />
		))}
	</View>
);
