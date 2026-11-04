import { Tabs } from "expo-router";
import type { ReactElement } from "react";
import type { MainTabsProps } from "./main-tabs-props";
import { useTheme } from "./theme";

export const MainTabsFallback = (_props: MainTabsProps): ReactElement => {
	const theme = useTheme();
	return (
		<Tabs
			initialRouteName="index"
			backBehavior="history"
			tabBar={(): undefined => undefined}
			screenOptions={{
				headerShown: false,
				lazy: true,
				freezeOnBlur: true,
				animation: "none",
				sceneStyle: { backgroundColor: theme.background.canvas },
			}}
		>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="schedule" />
			<Tabs.Screen name="messages" />
			<Tabs.Screen name="club" />
		</Tabs>
	);
};
