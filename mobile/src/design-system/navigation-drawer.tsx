import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	Animated,
	Easing,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./icon-button";
import { materialColors } from "./materials";
import { Row } from "./row";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, motion, opacity, space } from "./tokens";
import { useMotion } from "./use-motion";

type Props = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
};
export const NavigationDrawer = ({
	isOpen,
	onOpenChange,
	title,
	children,
}: Props): ReactElement => {
	const theme = useTheme();
	const colors = materialColors(theme);
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const drawerWidth = Math.min(geometry.drawer, width - space.xxl);
	const canAnimate = useMotion();
	const progress = useRef(new Animated.Value(0)).current;
	const [present, setPresent] = useState(isOpen);
	useEffect(() => {
		if (isOpen) setPresent(true);
		const animation = Animated.timing(progress, {
			toValue: isOpen ? 1 : 0,
			duration: canAnimate ? motion.duration.slow : 0,
			easing: Easing.bezier(...motion.easing.sheet),
			useNativeDriver: Platform.OS !== "web",
		});
		animation.start(({ finished }) => {
			if (finished && !isOpen) setPresent(false);
		});
		return (): void => animation.stop();
	}, [isOpen, canAnimate, progress]);
	return (
		<Modal
			visible={isOpen || present}
			transparent
			animationType="none"
			onRequestClose={(): void => onOpenChange(false)}
		>
			<View style={{ flex: 1 }} accessibilityViewIsModal>
				<Animated.View
					style={{
						position: "absolute",
						inset: 0,
						backgroundColor: theme.background.contrast,
						opacity: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [0, opacity.backdrop],
						}),
					}}
				/>
				<Pressable
					accessible={false}
					focusable={false}
					onPress={(): void => onOpenChange(false)}
					style={{ position: "absolute", inset: 0 }}
				/>
				<Animated.View
					style={{
						width: drawerWidth,
						flex: 1,
						boxShadow: colors.overlayShadow,
						borderRightWidth: geometry.border,
						borderColor: colors.border,
						backgroundColor: theme.background.primary,
						borderTopRightRadius: corners.overlay,
						borderBottomRightRadius: corners.overlay,
						overflow: "hidden",
						transform: [
							{
								translateX: progress.interpolate({
									inputRange: [0, 1],
									outputRange: [-drawerWidth, 0],
								}),
							},
						],
					}}
				>
					<View
						style={{
							paddingTop: insets.top + space.sm,
							paddingHorizontal: space.md,
							paddingBottom: space.sm,
							borderBottomWidth: geometry.border,
							borderBottomColor: colors.border,
						}}
					>
						<Row justify="between">
							<Text variant="h4">{title}</Text>
							<IconButton
								icon="close"
								label="Close navigation menu"
								onPress={(): void => onOpenChange(false)}
							/>
						</Row>
					</View>
					<ScrollView
						contentContainerStyle={{
							padding: space.sm,
							paddingBottom: insets.bottom + space.lg,
						}}
						keyboardShouldPersistTaps="handled"
					>
						{children}
					</ScrollView>
				</Animated.View>
			</View>
		</Modal>
	);
};
