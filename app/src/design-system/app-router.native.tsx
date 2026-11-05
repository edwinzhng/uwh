import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import type { ReactElement } from "react";
import type { AppRouterProps } from "./app-router-props";
import {
	nativeRouteTitle,
	nativeStackAnimation,
} from "./native-navigation-model";
import { useTheme } from "./theme";
import { useMotion } from "./use-motion";

export const AppRouter = ({ renderScreen }: AppRouterProps): ReactElement => {
	const theme = useTheme();
	const motionEnabled = useMotion();
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
				screenLayout={
					renderScreen
						? ({ route, children }): ReactElement =>
								renderScreen(route.name, { ...route.params }, children)
						: undefined
				}
				initialRouteName="(tabs)"
				screenOptions={({ route }) => ({
					title: nativeRouteTitle(route.name),
					headerShown: false,
					freezeOnBlur: true,
					animation: nativeStackAnimation(route.name, motionEnabled),
					gestureEnabled: true,
					fullScreenGestureEnabled: false,
					presentation: "card",
					contentStyle: { backgroundColor: theme.background.canvas },
				})}
			/>
		</ThemeProvider>
	);
};
