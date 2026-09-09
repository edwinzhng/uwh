import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { type GlassMaterial, materialColors, materials } from "./materials";
import { useTheme } from "./theme";

export const GlassBackdrop = ({
	material,
}: {
	material: GlassMaterial;
}): ReactElement => {
	const theme = useTheme();
	const colors = materialColors(theme);
	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{material === "floating" && Platform.OS !== "android" ? (
				<BlurView
					tint={theme.background.primary === "#FFFFFF" ? "light" : "dark"}
					intensity={materials.intensity.floating}
					style={StyleSheet.absoluteFill}
				/>
			) : undefined}
			<View
				style={[StyleSheet.absoluteFill, { backgroundColor: colors[material] }]}
			/>
			<LinearGradient
				colors={[colors.shine, "transparent", colors.refraction]}
				locations={[0, 0.5, 1]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
			<View style={[StyleSheet.absoluteFill, { boxShadow: colors.rim }]} />
		</View>
	);
};
