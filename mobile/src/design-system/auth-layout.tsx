import type { ReactElement, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const AuthLayout = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.background.secondary }}
		>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					keyboardShouldPersistTaps="handled"
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
						}}
					>
						<Surface>
							<Stack gap="lg">
								<Text variant="h2">{title}</Text>
								{children}
							</Stack>
						</Surface>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
