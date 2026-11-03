import { LinearGradient } from "expo-linear-gradient";
import { type ReactElement, useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { MaterialTexture } from "./material-texture";
import { useTheme } from "./theme";
import { space } from "./tokens";

export const GlassPreviewBackground = (): ReactElement => {
	const theme = useTheme();
	const id = useId();
	const dark = theme.mode === "dark";
	const cell = space.xl * 0.8;
	return (
		<View
			pointerEvents="none"
			style={[
				StyleSheet.absoluteFill,
				{ backgroundColor: theme.background.canvas, overflow: "hidden" },
			]}
		>
			<View style={[StyleSheet.absoluteFill, { opacity: dark ? 0.12 : 0.1 }]}>
				<MaterialTexture category="sky" seed="glass-preview" animated={false} />
			</View>
			<Svg width="100%" height="100%">
				<Defs>
					<Pattern
						id={id}
						width={cell}
						height={cell}
						patternUnits="userSpaceOnUse"
					>
						<Path
							d={`M 0 ${cell} V 0 H ${cell}`}
							stroke={dark ? "rgba(160,183,215,0.13)" : "rgba(40,59,79,0.07)"}
							fill="none"
							strokeWidth={1}
						/>
					</Pattern>
				</Defs>
				<Rect width="100%" height="100%" fill={`url(#${id})`} />
			</Svg>
			<LinearGradient
				colors={
					dark
						? ["rgba(167,188,225,0.12)", "transparent", "rgba(0,0,0,0.24)"]
						: ["rgba(255,255,255,0.5)", "transparent", "rgba(55,71,95,0.07)"]
				}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={StyleSheet.absoluteFill}
			/>
		</View>
	);
};
