import { useFonts } from "expo-font";
import type { ReactElement, ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActionToaster } from "./action-toaster";
import { DateTimeStyles } from "./date-time-styles";
import { fontSources } from "./fonts";
import { MotionProvider } from "./motion-provider";
import { PopupStyles } from "./popup-styles";
import { ScrollbarStyles } from "./scrollbar-styles";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";

export const DesignProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const [loaded, error] = useFonts(fontSources);
	const theme = useTheme();
	return (
		<GestureHandlerRootView
			style={{ flex: 1, backgroundColor: theme.background.primary }}
		>
			<SafeAreaProvider>
				<MotionProvider>
					<PopupStyles />
					<ScrollbarStyles />
					<DateTimeStyles />
					{loaded ? (
						children
					) : (
						<Stack padding="xl">
							<Text>
								{error
									? "The fonts could not load. Restart the preview to retry."
									: "Opening Crocs Club…"}
							</Text>
						</Stack>
					)}
					<ActionToaster />
				</MotionProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};
