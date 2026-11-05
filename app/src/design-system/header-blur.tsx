import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { edgeFadeLocations } from "./edge-fade";
import { useTheme } from "./theme";

export const HeaderBlur = ({
	height,
	tail,
	edge,
}: {
	height: number;
	tail: number;
	edge: "top" | "bottom";
}): ReactElement => {
	const theme = useTheme();
	return (
		<MaskedView
			style={StyleSheet.absoluteFill}
			maskElement={
				<LinearGradient
					colors={
						edge === "top"
							? ["black", "black", "transparent"]
							: ["transparent", "black", "black"]
					}
					locations={edgeFadeLocations(height, tail, edge)}
					style={StyleSheet.absoluteFill}
				/>
			}
		>
			<BlurView
				intensity={15}
				tint={theme.mode}
				style={StyleSheet.absoluteFill}
			/>
		</MaskedView>
	);
};
