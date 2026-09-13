import type { ReactElement, ReactNode } from "react";
import {
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import clubLogo from "../../assets/club-logo.png";
import { AuthBackground } from "./auth-background";
import { GlassPanel } from "./glass-panel";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

import { useTheme } from "./theme";
import { space } from "./tokens";

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
			nativeID="auth-surface"
			style={{ flex: 1, backgroundColor: theme.background.secondary }}
		>
			<AuthBackground />
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
							maxWidth: 440,
							alignSelf: "center",
						}}
					>
						<GlassPanel padding="lg">
							<Stack gap="lg">
								<Row gap="sm">
									<Image source={clubLogo} style={{ width: 32, height: 32 }} />
									<Text variant="h1">{title}</Text>
								</Row>
								{children}
							</Stack>
						</GlassPanel>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
