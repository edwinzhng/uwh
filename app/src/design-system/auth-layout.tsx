import { StatusBar } from "expo-status-bar";
import { type ReactElement, type ReactNode, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthBackdrop } from "./auth-backdrop";
import { useAuthBackdropGeometry } from "./auth-backdrop-geometry";
import { ContentReveal } from "./content-reveal";
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
	footer,
}: {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	const backdrop = useAuthBackdropGeometry();
	const insets = useSafeAreaInsets();
	const [columnTop, setColumnTop] = useState<number>();
	const [contentTop, setContentTop] = useState<number>();
	const logoTop =
		columnTop === undefined || contentTop === undefined
			? undefined
			: insets.top + columnTop + contentTop;
	return (
		<SafeAreaView nativeID="auth-surface" style={{ flex: 1 }}>
			<AuthBackdrop scale={backdrop.scale} logoTop={logoTop} />
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
						padding: space.lg,
						gap: space.lg,
					}}
				>
					<View
						style={{
							height: backdrop.playersSpace,
							marginTop: -space.lg,
						}}
					/>
					<View
						onLayout={(event): void => setColumnTop(event.nativeEvent.layout.y)}
						style={{
							flexGrow: 1,
							justifyContent: "center",
							width: "100%",
							maxWidth: 440,
							alignSelf: "center",
						}}
					>
						<View
							onLayout={(event): void =>
								setContentTop(event.nativeEvent.layout.y)
							}
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
					</View>
					{footer ? (
						<View style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
							{footer}
						</View>
					) : undefined}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};
