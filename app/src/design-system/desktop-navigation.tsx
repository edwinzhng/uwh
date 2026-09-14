import type { ReactElement, ReactNode } from "react";
import {
	type ImageSourcePropType,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandIdentity } from "./brand-identity";
import type { NavigationItem } from "./navigation-control";
import { SidebarNavigation } from "./sidebar-navigation";
import { Stack } from "./stack";
import { useTheme } from "./theme";
import { geometry, layer, space } from "./tokens";
import { WaterBackground } from "./water-background";
export const DesktopNavigation = ({
	brand,
	logo,
	onBrandPress,
	navigation,
	profile,
	notifications,
}: {
	brand: string;
	logo?: ImageSourcePropType;
	onBrandPress: () => void;
	navigation: NavigationItem[];
	profile: ReactNode;
	notifications: ReactNode;
}): ReactElement | undefined => {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	if (width < geometry.wide) return undefined;
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
				backgroundColor: theme.background.primary,
				zIndex: layer.sticky,
			}}
		>
			<WaterBackground />
			<Stack gap="xl">
				<BrandIdentity name={brand} logo={logo} onPress={onBrandPress} />
				<SidebarNavigation navigation={navigation} />
			</Stack>
			<View
				style={{
					marginTop: "auto",
					paddingTop: space.sm,
					paddingBottom: insets.bottom,
				}}
			>
				<Stack gap="xs">
					{notifications}
					<View
						style={{
							marginHorizontal: -space.sm,
							height: geometry.border,
							backgroundColor: theme.border,
						}}
					/>
					{profile}
				</Stack>
			</View>
		</View>
	);
};
