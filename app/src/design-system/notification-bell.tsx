import { type ReactElement, useEffect, useState } from "react";
import { Text as NativeText, Pressable, View } from "react-native";
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, motion, space } from "./tokens";
import { useMotion } from "./use-motion";

export const NotificationBell = ({
	count,
	label,
	onPress,
}: {
	count: number;
	label?: string;
	onPress: () => void;
}): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const animate = useMotion();
	const total = Math.max(0, Math.floor(count));
	const rotation = useSharedValue(0);
	const badgeOpacity = useSharedValue(total > 0 ? 1 : 0);
	const badgeOffset = useSharedValue(0);
	useEffect((): void => {
		const duration = animate ? motion.duration.fast : motion.duration.instant;
		const timing = {
			duration,
			easing: Easing.bezier(...motion.easing.out),
			reduceMotion: ReduceMotion.System,
		};
		if (total > 0) {
			rotation.set(
				withSequence(
					withTiming(10, timing),
					withTiming(-7, timing),
					withTiming(0, timing),
				),
			);
			badgeOpacity.set(0);
			badgeOffset.set(4);
			badgeOpacity.set(
				withTiming(1, {
					...timing,
					duration: animate
						? motion.duration.standard
						: motion.duration.instant,
				}),
			);
			badgeOffset.set(
				withTiming(0, {
					...timing,
					duration: animate
						? motion.duration.standard
						: motion.duration.instant,
				}),
			);
		}
	}, [animate, badgeOffset, badgeOpacity, rotation, total]);
	const bellStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.get()}deg` }],
	}));
	const badgeStyle = useAnimatedStyle(() => ({
		opacity: badgeOpacity.get(),
		transform: [{ translateY: badgeOffset.get() }],
	}));
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Notifications, ${total} unread`}
			onPress={onPress}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			style={({ pressed }) => ({
				width: label ? "100%" : geometry.touch,
				flexDirection: "row",
				gap: space.sm,
				paddingHorizontal: label ? space.sm : 0,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: label ? "flex-start" : "center",
				borderRadius: corners.control,
				backgroundColor:
					hovered || pressed ? theme.background.hover : "transparent",
			})}
		>
			<Animated.View style={bellStyle}>
				<Icon name="bell" size="sm" />
			</Animated.View>
			{label ? (
				<Text variant="small" lines={1}>
					{label}
				</Text>
			) : undefined}
			{total > 0 ? (
				<View
					pointerEvents="none"
					style={{
						position: label ? "relative" : "absolute",
						right: label ? undefined : 0,
						top: label ? undefined : 0,
						minWidth: 18,
						height: 18,
						paddingHorizontal: 4,
						borderRadius: 9,
						backgroundColor: theme.dangerAction.background,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Animated.View style={badgeStyle}>
						<NativeText
							style={{
								fontFamily: font.semibold,
								fontSize: 11,
								color: theme.dangerAction.foreground,
							}}
						>
							{total > 99 ? "99+" : total}
						</NativeText>
					</Animated.View>
				</View>
			) : undefined}
		</Pressable>
	);
};
