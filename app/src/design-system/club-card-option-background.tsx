import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import type { ClubCardTreatment } from "./club-card-option";
import { MaterialTexture } from "./material-texture";
import { useTheme } from "./theme";
import { type CategoryColor, categoryPalette, space } from "./tokens";

export const ClubCardOptionBackground = ({
	treatment,
	category,
	seed,
}: {
	treatment: ClubCardTreatment;
	category: CategoryColor;
	seed: string;
}): ReactElement => {
	const theme = useTheme();
	const watercolor =
		treatment === "watercolor-soft" ||
		treatment === "watercolor-bold" ||
		treatment === "hybrid-watercolor";
	const bold = treatment === "watercolor-bold";
	return (
		<View
			pointerEvents="none"
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={StyleSheet.absoluteFill}
		>
			{watercolor ? (
				<>
					<View
						style={[
							StyleSheet.absoluteFill,
							{
								opacity: bold
									? 1
									: treatment === "hybrid-watercolor"
										? 0.35
										: 0.5,
							},
						]}
					>
						<MaterialTexture
							category={category}
							seed={seed}
							animated={false}
							rounded={false}
						/>
					</View>
					<LinearGradient
						colors={
							bold
								? [
										`${theme.background.card}F5`,
										`${theme.background.card}C7`,
										`${theme.background.card}80`,
									]
								: [
										`${theme.background.card}F5`,
										`${theme.background.card}E6`,
										`${theme.background.card}B3`,
									]
						}
						locations={[0, 0.45, 1]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={StyleSheet.absoluteFill}
					/>
				</>
			) : treatment === "corner" ? (
				<View
					style={{
						position: "absolute",
						top: -space.xl,
						right: -space.xl,
						width: space.xxxl,
						height: space.xxxl,
						transform: [{ rotate: "45deg" }],
						backgroundColor: categoryPalette[theme.mode][category].background,
					}}
				/>
			) : undefined}
		</View>
	);
};
