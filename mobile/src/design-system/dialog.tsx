import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
} from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "./badge";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { materialColors } from "./materials";
import { PopupPortalProvider } from "./popup-portal-provider";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, layer, motion, opacity, space } from "./tokens";
import { useMotion } from "./use-motion";

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	staffRole?: "coach" | "admin";
};
export const Dialog = ({
	isOpen,
	onOpenChange,
	title,
	children,
	footer,
	staffRole,
}: Props): ReactElement => {
	const theme = useTheme();
	const animate = useMotion();
	const [retained, setRetained] = useState(isOpen);
	useEffect(() => {
		if (isOpen) {
			setRetained(true);
			return;
		}
		const timeout = setTimeout(
			() => setRetained(false),
			animate ? motion.duration.toggle : 0,
		);
		return (): void => clearTimeout(timeout);
	}, [isOpen, animate]);
	const colors = materialColors(theme);
	const insets = useSafeAreaInsets();
	return (
		<Modal
			visible={isOpen || retained}
			transparent
			animationType="none"
			onRequestClose={(): void => onOpenChange(false)}
		>
			<PopupPortalProvider>
				<Animated.View
					style={{
						flex: 1,
						opacity: isOpen ? 1 : 0,
						transitionProperty: "opacity",
						transitionDuration: animate ? motion.duration.toggle : 0,
						transitionTimingFunction: cubicBezier(...motion.easing.out),
					}}
				>
					<KeyboardAvoidingView
						behavior={Platform.OS === "ios" ? "padding" : "height"}
						enabled={Platform.OS !== "web"}
						accessibilityViewIsModal
						style={{
							flex: 1,
							justifyContent: "center",
							padding: space.lg,
							paddingTop: Math.max(space.lg, insets.top),
							paddingBottom: Math.max(space.lg, insets.bottom),
							zIndex: layer.modal,
						}}
					>
						<Pressable
							accessible={false}
							focusable={false}
							onPress={(): void => onOpenChange(false)}
							style={{
								position: "absolute",
								zIndex: layer.backdrop,
								top: 0,
								right: 0,
								bottom: 0,
								left: 0,
								backgroundColor: theme.background.contrast,
								opacity: opacity.backdrop,
							}}
						/>
						<Animated.View
							key={String(isOpen)}
							style={{
								animationName: animate
									? {
											from: {
												opacity: isOpen ? 0 : 1,
												transform: [{ scale: isOpen ? 0.97 : 1 }],
											},
											to: {
												opacity: isOpen ? 1 : 0,
												transform: [{ scale: isOpen ? 1 : 0.97 }],
											},
										}
									: undefined,
								animationDuration: motion.duration.toggle,
								animationFillMode: "forwards",
								animationTimingFunction: cubicBezier(...motion.easing.out),
								maxHeight: "100%",
								width: "100%",
								maxWidth: geometry.reading,
								alignSelf: "center",
								zIndex: layer.modal,
								borderColor: theme.border,
								backgroundColor: theme.background.primary,
								borderWidth: geometry.border,
								borderRadius: corners.overlay,
								boxShadow: colors.overlayShadow,
							}}
						>
							<ScrollView
								keyboardShouldPersistTaps="handled"
								style={{
									flexGrow: 0,
									flexShrink: 1,
									borderRadius: corners.overlay,
									overflow: "hidden",
								}}
								contentContainerStyle={{ padding: space.md }}
							>
								<Stack gap="lg">
									<Row align="start" justify="between">
										<Stack grow>
											<Row gap="xs" wrap>
												<Text variant="h3">{title}</Text>
												{staffRole ? (
													<Badge
														compact
														label={staffRole === "coach" ? "Coach" : "Admin"}
														kind={staffRole}
													/>
												) : undefined}
											</Row>
										</Stack>
										<IconButton
											label="Close dialog"
											icon="close"
											onPress={(): void => onOpenChange(false)}
										/>
									</Row>
									{children}
									{footer !== false ? (
										<Row justify="end">
											{footer ?? (
												<Button
													label="Done"
													onPress={(): void => onOpenChange(false)}
												/>
											)}
										</Row>
									) : undefined}
								</Stack>
							</ScrollView>
						</Animated.View>
					</KeyboardAvoidingView>
				</Animated.View>
			</PopupPortalProvider>
		</Modal>
	);
};
