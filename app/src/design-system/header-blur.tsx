import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactElement } from "react";
import { StyleSheet } from "react-native";
import { headerFade } from "./materials";
import { useTheme } from "./theme";

export const HeaderBlur = (): ReactElement => {
	const theme = useTheme();
	return (
		<MaskedView
			style={StyleSheet.absoluteFill}
			maskElement={
				<LinearGradient
					colors={["black", "black", "transparent"]}
					locations={[0, headerFade.start, headerFade.end]}
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
