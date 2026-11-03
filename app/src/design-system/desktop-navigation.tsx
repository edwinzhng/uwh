import type { ReactElement } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nativeTabsAvailable } from "./native-navigation";
import type { NavigationItem } from "./navigation-control";
import { SidebarNavigation } from "./sidebar-navigation";
import { useTheme } from "./theme";
import { geometry, layer, space } from "./tokens";
export const DesktopNavigation = ({
	navigation,
}: {
	navigation: NavigationItem[];
}): ReactElement | undefined => {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	if (nativeTabsAvailable() || width < geometry.wide) return undefined;
	return (
		<View
			nativeID="persistent-club-navigation"
			style={{
				position: "absolute",
				left: insets.left,
				top: insets.top,
				bottom: 0,
				width: geometry.popupWidth,
				padding: space.sm,
				borderRightWidth: geometry.border,
				borderRightColor: theme.border,
				backgroundColor: theme.background.canvas,
				zIndex: layer.sticky,
			}}
		>
			<SidebarNavigation navigation={navigation} />
		</View>
	);
};
