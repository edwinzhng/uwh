import { LinearGradient } from "expo-linear-gradient";
import { lazy, type ReactElement, Suspense } from "react";
import { StyleSheet, UIManager, View } from "react-native";
import { nativeFeatureAvailable } from "../platform/native-feature";
import { useReduceTransparency } from "./material-accessibility";
import { useTheme } from "./theme";

const Blur = lazy(() =>
	import("./header-blur").then((module) => ({ default: module.HeaderBlur })),
);

export const HeaderBackdrop = ({
	topInset = 0,
}: {
	topInset?: number;
}): ReactElement => {
	const theme = useTheme();
	const opaque = useReduceTransparency();
	const available =
		nativeFeatureAvailable("ExpoBlur") &&
		Boolean(UIManager.getViewManagerConfig("RNCMaskedView"));
	return (
		<View
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[StyleSheet.absoluteFill, { top: -topInset }]}
		>
			{opaque ? (
				<View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: theme.background.primary },
					]}
				/>
			) : (
				<>
					<LinearGradient
						colors={[
							`${theme.background.primary}33`,
							`${theme.background.primary}00`,
						]}
						style={StyleSheet.absoluteFill}
					/>
					{available ? (
						<Suspense fallback={undefined}>
							<Blur />
						</Suspense>
					) : undefined}
				</>
			)}
		</View>
	);
};
