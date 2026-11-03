import { StatusBar } from "expo-status-bar";
import type { ReactElement, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentReveal } from "./content-reveal";
import { LoadingBackdrop } from "./loading-backdrop";
import { PaginationScrollView as ScrollView } from "./pagination-scroll-view";
import { Stack } from "./stack";
import { Surface } from "./surface";
import { Text } from "./text";

import { useTheme } from "./theme";
import { space } from "./tokens";
import { UwhMark } from "./uwh-mark";

export const AuthLayout = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<SafeAreaView nativeID="auth-surface" style={{ flex: 1 }}>
			<LoadingBackdrop canvas={theme.background.canvas} line={theme.border} />
			<StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
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
					<View
						style={{
							width: "100%",
							maxWidth: 440,
							alignSelf: "center",
						}}
					>
						<ContentReveal gap="lg">
							<View
								style={{
									alignItems: "center",
									flexDirection: "row",
									justifyContent: "center",
									gap: space.xs,
								}}
							>
								<UwhMark size={40} />
								<Text variant="h1" lines={1}>
									UWH Club
								</Text>
							</View>
							<Surface padding="lg">
								<Stack gap="md">
									{title !== "UWH Club" ? (
										<Text variant="h4">{title}</Text>
									) : undefined}
									{children}
								</Stack>
							</Surface>
						</ContentReveal>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
