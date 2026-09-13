import type { ReactElement } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "./theme";
import { useMotion } from "./use-motion";

export const LoadingScreen = (): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: theme.background.secondary,
			}}
		>
			<ActivityIndicator
				size="large"
				color={theme.text.secondary}
				animating={canAnimate}
				hidesWhenStopped={false}
				accessibilityLabel="Loading"
			/>
		</View>
	);
};
