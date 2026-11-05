import { LinearGradient } from "expo-linear-gradient";
import { lazy, type ReactElement, Suspense, useState } from "react";
import { StyleSheet, UIManager, View } from "react-native";
import { nativeFeatureAvailable } from "../platform/native-feature";
import { edgeFadeLocations } from "./edge-fade";
import { useReduceTransparency } from "./material-accessibility";
import { useTheme } from "./theme";
import { space } from "./tokens";

const Blur = lazy(() =>
	import("./header-blur").then((module) => ({ default: module.HeaderBlur })),
);

export const HeaderBackdrop = ({
	topInset = 0,
	edge = "top",
	fadeInset = space.md,
}: {
	topInset?: number;
	edge?: "top" | "bottom";
	fadeInset?: number;
}): ReactElement => {
	const theme = useTheme();
	const [height, setHeight] = useState(0);
	const opaque = useReduceTransparency();
	const available =
		nativeFeatureAvailable("ExpoBlur") &&
		Boolean(UIManager.getViewManagerConfig("RNCMaskedView"));
	return (
		<View
			onLayout={(event): void => setHeight(event.nativeEvent.layout.height)}
			pointerEvents="none"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				StyleSheet.absoluteFill,
				{
					top: edge === "top" ? -topInset : opaque ? 0 : -fadeInset,
					bottom: edge === "top" ? (opaque ? 0 : -fadeInset) : -topInset,
				},
			]}
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
						colors={
							edge === "top"
								? [
										`${theme.background.primary}33`,
										`${theme.background.primary}33`,
										`${theme.background.primary}00`,
									]
								: [
										`${theme.background.primary}00`,
										`${theme.background.primary}33`,
										`${theme.background.primary}33`,
									]
						}
						locations={edgeFadeLocations(height, fadeInset, edge)}
						style={StyleSheet.absoluteFill}
					/>
					{available ? (
						<Suspense fallback={undefined}>
							<Blur height={height} tail={fadeInset} edge={edge} />
						</Suspense>
					) : undefined}
				</>
			)}
		</View>
	);
};
