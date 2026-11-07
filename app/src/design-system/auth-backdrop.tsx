import type { ReactElement } from "react";
import { Image, StyleSheet, View } from "react-native";
import {
	authBackdropPhoto,
	useAuthBackdropPlacement,
} from "./auth-backdrop-geometry";
import { useTheme } from "./theme";

const scrimOpacity = { dark: 0.12, light: 0.08 } as const;

export const AuthBackdrop = ({
	scale,
	logoTop,
}: {
	scale: number;
	logoTop?: number;
}): ReactElement => {
	const theme = useTheme();
	const placement = useAuthBackdropPlacement(scale, logoTop);
	return (
		<View
			pointerEvents="none"
			accessible={false}
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{ backgroundColor: theme.background.canvas, overflow: "hidden" },
			]}
		>
			<Image
				source={authBackdropPhoto.source}
				resizeMode="cover"
				accessibilityIgnoresInvertColors
				style={{ position: "absolute", ...placement }}
			/>
			<View
				style={[
					StyleSheet.absoluteFill,
					{
						backgroundColor: theme.background.canvas,
						opacity: scrimOpacity[theme.mode],
					},
				]}
			/>
		</View>
	);
};
