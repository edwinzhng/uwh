import {
	GlassView,
	isGlassEffectAPIAvailable,
	isLiquidGlassAvailable,
} from "expo-glass-effect";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { useReduceTransparency } from "./material-accessibility";
import type { GlassMaterial } from "./materials";
import { useTheme } from "./theme";
import { useMotion } from "./use-motion";

export const AvailableGlassBackdrop = ({
	material,
	radius,
}: {
	material: GlassMaterial;
	radius?: number;
}): ReactElement => {
	const theme = useTheme();
	const reduceTransparency = useReduceTransparency();
	const motionEnabled = useMotion();
	return material === "floating" &&
		!reduceTransparency &&
		motionEnabled &&
		isGlassEffectAPIAvailable() &&
		isLiquidGlassAvailable() ? (
		<GlassView
			pointerEvents="none"
			glassEffectStyle="regular"
			tintColor={
				theme.mode === "dark" ? "rgba(25,30,37,0.1)" : "rgba(255,255,255,0.1)"
			}
			colorScheme={theme.mode}
			style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
		/>
	) : (
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
