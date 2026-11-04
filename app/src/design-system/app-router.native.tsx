import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import type { ReactElement } from "react";
import { HeaderBackdrop } from "./header-backdrop";
import { nativeHeaderRoute, nativeRouteTitle } from "./native-navigation-model";
import { useTheme } from "./theme";

const headerBackground = (): ReactElement => <HeaderBackdrop />;

export const AppRouter = (): ReactElement => {
	const theme = useTheme();
	const base = theme.mode === "dark" ? DarkTheme : DefaultTheme;
	return (
		<ThemeProvider
			value={{
				...base,
				colors: {
					...base.colors,
					background: theme.background.canvas,
					card: theme.background.primary,
					text: theme.text.primary,
					border: theme.border,
					primary: theme.text.primary,
				},
			}}
		>
			<Stack
				initialRouteName="(tabs)"
				screenOptions={({ route }) => ({
					title: nativeRouteTitle(route.name),
					headerShown: nativeHeaderRoute(route.name),
					headerBackButtonDisplayMode: "generic",
					headerTransparent: true,
					headerBackground,
					headerTintColor: theme.text.primary,
					headerStyle: { backgroundColor: "transparent" },
					headerShadowVisible: false,
					freezeOnBlur: true,
					animation: "none",
					gestureEnabled: true,
					fullScreenGestureEnabled: false,
					presentation: "card",
					contentStyle: { backgroundColor: theme.background.canvas },
				})}
			/>
		</ThemeProvider>
	);
};
