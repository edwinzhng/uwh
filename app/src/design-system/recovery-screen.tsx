import type { ReactElement } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./button";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const RecoveryScreen = ({
	onRetry,
	isRetrying = false,
}: {
	onRetry: () => void;
	isRetrying?: boolean;
}): ReactElement => {
	const theme = useTheme();
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.background.canvas }}>
			<ScrollView
				alwaysBounceVertical={false}
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: "center",
					padding: space.lg,
				}}
			>
				<View
					style={{
						width: "100%",
						maxWidth: geometry.reading,
						alignSelf: "center",
						alignItems: "flex-start",
						gap: space.lg,
					}}
				>
					<View accessibilityRole="alert">
						<Text variant="h4">Couldn’t load this screen</Text>
					</View>
					<Button label="Try again" isLoading={isRetrying} onPress={onRetry} />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};
