import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import type { HomeCardTreatment } from "./home-card-treatment";
import { useTheme } from "./theme";
import { type CategoryColor, categoryPalette, space } from "./tokens";
import { WatercolorShader } from "./watercolor-shader";

export const HomeCardBackground = ({
	treatment,
	category,
	seed,
}: {
	treatment: Exclude<HomeCardTreatment, "current">;
	category: CategoryColor;
	seed: string;
}): ReactElement => {
	const theme = useTheme();
	const colors = categoryPalette[theme.mode][category];
	return treatment === "accent" ? (
		<View
			pointerEvents="none"
			accessible={false}
			style={StyleSheet.absoluteFill}
		>
			<LinearGradient
				colors={[`${colors.background}CC`, `${theme.background.card}00`]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0.5 }}
				style={StyleSheet.absoluteFill}
			/>
			<View
				style={{
					position: "absolute",
					insetBlock: 0,
					insetInlineStart: 0,
					width: space.xxs,
					backgroundColor: colors.foreground,
				}}
			/>
		</View>
	) : (
		<WatercolorShader category={category} seed={seed} />
	);
};
