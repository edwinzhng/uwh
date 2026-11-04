import { useFonts } from "expo-font";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useSetAtom } from "jotai";
import {
	type ReactElement,
	type ReactNode,
	useLayoutEffect,
	useMemo,
} from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionToaster } from "./action-toaster";
import { AppTitle } from "./app-title";
import { CardMaterialProvider } from "./card-material-provider";
import { DateTimeStyles } from "./date-time-styles";
import { fontSources } from "./fonts";
import { InputStyles } from "./input-styles";
import { LoadingHandoff } from "./loading-handoff";
import { LoadingScope } from "./loading-scope";
import { MaterialAccessibilityProvider } from "./material-accessibility";
import { MotionProvider } from "./motion-provider";
import { PageMaterialBackground } from "./page-material-background";
import { PopupStyles } from "./popup-styles";
import { ScrollbarStyles } from "./scrollbar-styles";
import { Stack } from "./stack";
import { Text } from "./text";
import { systemThemeAtom, useTheme } from "./theme";
import { useClientReady } from "./use-client-ready";

export const DesignProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const [loaded, error] = useFonts(fontSources);
	const clientReady = useClientReady();
	const system = useColorScheme();
	const setSystemTheme = useSetAtom(systemThemeAtom);
	useLayoutEffect(
		(): void => setSystemTheme(system === "dark" ? "dark" : "light"),
		[system, setSystemTheme],
	);
	const theme = useTheme();
	const navigationTheme = useMemo(() => {
		const base = theme.mode === "dark" ? DarkTheme : DefaultTheme;
		return {
			...base,
			colors: {
				...base.colors,
				background: "transparent",
				text: theme.text.primary,
				primary: theme.accent.background,
				card: theme.background.card,
				border: theme.border,
			},
		};
	}, [theme]);
	return (
		<GestureHandlerRootView
			style={{ flex: 1, backgroundColor: theme.background.canvas }}
		>
			<SafeAreaProvider>
				<MaterialAccessibilityProvider>
					<MotionProvider>
						<ThemeProvider value={navigationTheme}>
							<CardMaterialProvider>
								<PageMaterialBackground />
								<StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
								<AppTitle />
								<PopupStyles />
								<ScrollbarStyles />
								<DateTimeStyles />
								<InputStyles />
								<LoadingHandoff
									fillViewport
									loading={!clientReady || (!loaded && !error)}
								>
									<LoadingScope>
										{loaded ? (
											children
										) : error ? (
											<Stack padding="xl">
												<Text>
													The fonts could not load. Restart the app to retry.
												</Text>
											</Stack>
										) : undefined}
									</LoadingScope>
								</LoadingHandoff>
								<ActionToaster />
							</CardMaterialProvider>
						</ThemeProvider>
					</MotionProvider>
				</MaterialAccessibilityProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};
