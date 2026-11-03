import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { previewGlassColors, useGlassPreview } from "./glass-preview-context";
import { useReduceTransparency } from "./material-accessibility";
import { type GlassMaterial, materialColors } from "./materials";
import { useTheme } from "./theme";

export const GlassBackdrop = ({
	material,
	showRim = true,
	radius,
}: {
	material: GlassMaterial;
	showRim?: boolean;
	radius?: number;
}): ReactElement => {
	const theme = useTheme();
	const colors = materialColors(theme);
	const treatment = useGlassPreview();
	const opaque = useReduceTransparency();
	const glass = previewGlassColors(theme.mode === "dark", treatment ?? "clear");
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{ borderRadius: radius, overflow: "hidden" },
			]}
		>
			<View
				style={[
					StyleSheet.absoluteFill,
					{
						backgroundColor: opaque
							? theme.background.primary
							: material === "floating"
								? glass.fill
								: colors[material],
					},
				]}
			/>
			<LinearGradient
				colors={[opaque ? "transparent" : glass.highlight, "transparent"]}
				locations={[0, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			{showRim ? (
				<View
					style={[
						StyleSheet.absoluteFill,
						{ borderRadius: radius, boxShadow: opaque ? "none" : glass.rim },
					]}
				/>
			) : undefined}
		</View>
	);
};
