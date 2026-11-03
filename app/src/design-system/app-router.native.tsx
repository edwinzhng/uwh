import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import type { ReactElement } from "react";
import { nativeHeaderRoute, nativeRouteTitle } from "./native-navigation-model";
import { useTheme } from "./theme";
import { motion } from "./tokens";
import { useMotion } from "./use-motion";

export const AppRouter = (): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
	const base = theme.mode === "dark" ? DarkTheme : DefaultTheme;
	return (
		<ThemeProvider
			value={{
				...base,
				colors: {
					...base.colors,
					background: "transparent",
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
					headerTitle: "",
					headerTintColor: theme.text.primary,
					headerStyle: { backgroundColor: "transparent" },
					headerShadowVisible: false,
					freezeOnBlur: true,
					animation: animate ? "fade" : "none",
					animationDuration: motion.duration.slow,
					gestureEnabled: true,
					fullScreenGestureEnabled: false,
					presentation: "card",
					contentStyle: { backgroundColor: "transparent" },
				})}
			/>
		</ThemeProvider>
	);
};
