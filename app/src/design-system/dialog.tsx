import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "./badge";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { materialColors } from "./materials";
import { PopupPortalProvider } from "./popup-portal-provider";
import { Row } from "./row";
import { ScrollArea } from "./scroll-area";
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
}: Props): ReactElement | undefined => {
	const theme = useTheme();
	const { height } = useWindowDimensions();
	const animate = useMotion();
	const [retained, setRetained] = useState(isOpen);
	const progress = useSharedValue(isOpen ? 1 : 0);
	useEffect(() => {
		if (!isOpen && !retained) return;
		if (isOpen) {
			setRetained(true);
		}
		progress.set(
			withTiming(isOpen ? 1 : 0, {
				duration: animate ? motion.duration.standard : motion.duration.instant,
				easing: Easing.bezier(...motion.easing.out),
				reduceMotion: ReduceMotion.System,
			}),
		);
		if (isOpen) return;
		const timeout = setTimeout(
			() => setRetained(false),
			animate ? motion.duration.standard : 0,
		);
		return (): void => clearTimeout(timeout);
	}, [isOpen, animate, progress, retained]);
	const backdropStyle = useAnimatedStyle(() => ({
		opacity: progress.get(),
	}));
	const panelStyle = useAnimatedStyle(() => ({
		opacity: progress.get(),
		transform: [{ scale: 0.97 + progress.get() * 0.03 }],
	}));
	const colors = materialColors(theme);
	const insets = useSafeAreaInsets();
	if (!isOpen && !retained) return undefined;
	return (
		<Modal
			visible={isOpen || retained}
			transparent
			animationType="none"
			onRequestClose={(): void => onOpenChange(false)}
		>
			<PopupPortalProvider>
				<Animated.View style={[{ flex: 1 }, backdropStyle]}>
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
							style={[
								{
									maxHeight:
										height -
										Math.max(space.lg, insets.top) -
										Math.max(space.lg, insets.bottom),
									minHeight: 0,
									overflow: "hidden",
									width: "100%",
									maxWidth: geometry.reading,
									alignSelf: "center",
									zIndex: layer.modal,
									borderColor: theme.border,
									backgroundColor: theme.background.primary,
									borderWidth: geometry.border,
									borderRadius: corners.overlay,
									boxShadow: colors.overlayShadow,
								},
								panelStyle,
							]}
						>
							<View
								style={{
									padding: space.md,
									borderBottomWidth: geometry.border,
									borderBottomColor: theme.border,
								}}
							>
								<Row justify="between" align="center">
									<Row gap="xs" wrap>
										<Text variant="h4">{title}</Text>
										{staffRole ? (
											<Badge
												compact
												label={staffRole === "coach" ? "Coach" : "Admin"}
												kind={staffRole}
											/>
										) : undefined}
									</Row>
									<IconButton
										label="Close dialog"
										icon="close"
										onPress={(): void => onOpenChange(false)}
									/>
								</Row>
							</View>
							<ScrollArea
								keyboardShouldPersistTaps="handled"
								style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}
								contentContainerStyle={{ padding: space.md }}
							>
								{children}
							</ScrollArea>
							{footer !== false ? (
								<View
									style={{
										padding: space.md,
										borderTopWidth: geometry.border,
										borderTopColor: theme.border,
									}}
								>
									<Row justify="end">
										{footer ?? (
											<Button
												label="Done"
												onPress={(): void => onOpenChange(false)}
											/>
										)}
									</Row>
								</View>
							) : undefined}
						</Animated.View>
					</KeyboardAvoidingView>
				</Animated.View>
			</PopupPortalProvider>
		</Modal>
	);
};
