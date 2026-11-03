import { lazy, type ReactElement, Suspense } from "react";
import { StyleSheet, View } from "react-native";
import { nativeFeatureAvailable } from "../platform/native-feature";
import type { GlassMaterial } from "./materials";
import { useTheme } from "./theme";

type GlassBackdropProps = {
	material: GlassMaterial;
	showRim?: boolean;
	radius?: number;
};

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
}: GlassBackdropProps): ReactElement =>
	material === "floating" && nativeFeatureAvailable("ExpoGlassEffect") ? (
		<Suspense fallback={<OpaqueBackdrop material={material} />}>
			<AvailableGlass material={material} radius={radius} />
		</Suspense>
	) : (
		<OpaqueBackdrop material={material} />
	);
