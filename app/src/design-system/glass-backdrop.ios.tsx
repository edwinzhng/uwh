import { lazy, type ReactElement, Suspense } from "react";
import { StyleSheet, View } from "react-native";
import { nativeFeatureAvailable } from "../platform/native-feature";
import type { GlassBackdropProps } from "./glass-backdrop-props";
import { useTheme } from "./theme";

const OpaqueBackdrop = ({ material }: GlassBackdropProps): ReactElement => {
	const theme = useTheme();
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{
					backgroundColor:
						material === "selection"
							? theme.background.primary
							: theme.background.secondary,
				},
			]}
		/>
	);
};

const AvailableGlass = lazy(() =>
	import("./glass-backdrop-available.ios")
		.then((module) => ({ default: module.AvailableGlassBackdrop }))
		.catch(() => ({ default: OpaqueBackdrop })),
);

export const GlassBackdrop = ({
	material,
	radius,
	uniform,
}: GlassBackdropProps): ReactElement =>
	uniform ? (
		<View pointerEvents="none" />
	) : material === "floating" && nativeFeatureAvailable("ExpoGlassEffect") ? (
		<Suspense fallback={<OpaqueBackdrop material={material} />}>
			<AvailableGlass material={material} radius={radius} />
		</Suspense>
	) : (
		<OpaqueBackdrop material={material} />
	);
