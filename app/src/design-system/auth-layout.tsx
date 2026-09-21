import type { ReactElement, ReactNode } from "react";
import {
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import Animated, { Easing, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import clubLogo from "../../assets/club-logo.png";
import { AuthBackground } from "./auth-background";
import { GlassPanel } from "./glass-panel";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

import { useTheme } from "./theme";
import { corners, motion, space } from "./tokens";
import { useMotion } from "./use-motion";

export const AuthLayout = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const canAnimate = useMotion();
	const panelTransition = LinearTransition.duration(
		canAnimate ? motion.duration.slow : motion.duration.instant,
	).easing(Easing.bezier(...motion.easing.out));
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
					alwaysBounceVertical={false}
					bounces={false}
					keyboardShouldPersistTaps="handled"
					overScrollMode="never"
					contentContainerStyle={{
						flexGrow: 1,
						justifyContent: "center",
						padding: space.lg,
					}}
				>
					<Animated.View
						layout={panelTransition}
						style={{
							width: "100%",
							maxWidth: 440,
							alignSelf: "center",
						}}
					>
						<GlassPanel padding="lg" seamless>
							<Stack gap="lg">
								<Row gap="sm">
									<Image
										source={clubLogo}
										style={{
											width: 32,
											height: 32,
											borderRadius: corners.control,
										}}
									/>
									<Text variant="h1" tone="brand">
										{title}
									</Text>
								</Row>
								{children}
							</Stack>
						</GlassPanel>
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
