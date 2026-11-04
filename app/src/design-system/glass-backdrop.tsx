import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import type { GlassBackdropProps } from "./glass-backdrop-props";
import { previewGlassColors, useGlassPreview } from "./glass-preview-context";
import { useReduceTransparency } from "./material-accessibility";
import { materialColors } from "./materials";
import { useTheme } from "./theme";
import { space } from "./tokens";

export const GlassBackdrop = ({
	material,
	showRim = true,
	radius,
	softEdge = false,
	uniform = false,
}: GlassBackdropProps): ReactElement => {
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
				{ borderRadius: radius, overflow: softEdge ? "visible" : "hidden" },
			]}
		>
			<View
				style={[
					StyleSheet.absoluteFill,
					{
						backgroundColor: opaque
							? theme.background.primary
							: softEdge
								? uniform
									? "transparent"
									: colors.header
								: material === "floating"
									? glass.fill
									: colors[material],
					},
				]}
			/>
			{softEdge && !opaque ? (
				<LinearGradient
					colors={[uniform ? "transparent" : colors.header, "transparent"]}
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						right: 0,
						height: space.xs,
					}}
				/>
			) : undefined}
			<LinearGradient
				colors={[
					opaque || uniform ? "transparent" : glass.highlight,
					"transparent",
				]}
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
