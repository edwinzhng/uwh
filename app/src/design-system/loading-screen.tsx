import { StatusBar } from "expo-status-bar";
import { type ReactElement, useCallback, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { LoadingBackdrop } from "./loading-backdrop";
import { loadingColors } from "./loading-colors";
import { LoadingPuck } from "./loading-puck";
import { LoadingReveal } from "./loading-reveal";
import { LoadingWordmark } from "./loading-wordmark";
import { space, typography } from "./tokens";
export const LoadingScreen = (): ReactElement => {
	const [ready, setReady] = useState(false);
	const onReady = useCallback((): void => setReady(true), []);
	const { width } = useWindowDimensions();
	const size = Math.max(160, Math.min(width - space.md * 2, 320));
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: loadingColors.canvas,
			}}
			accessibilityRole="progressbar"
			accessibilityLabel="Loading UWH Club"
		>
			<StatusBar style="light" />
			<LoadingBackdrop />
			<View style={{ width: size, height: size }}>
				<LoadingReveal ready={ready}>
					<LoadingPuck size={size} appearance="dark" onReady={onReady} />
				</LoadingReveal>
				<View
					style={{
						position: "absolute",
						top: size / 2 - typography.h1.lineHeight / 2,
						left: 0,
						width: size,
					}}
				>
					<LoadingReveal
						ready
						wordmark
						distance={size / 2 - space.lg - typography.h1.lineHeight / 2}
					>
						<LoadingWordmark width={size} />
					</LoadingReveal>
				</View>
			</View>
		</View>
	);
};
