import { type ReactElement, useState } from "react";
import { Text as NativeText, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, font, geometry, motion, space } from "./tokens";
import { useMotion } from "./use-motion";

const ring = {
	"0%": { transform: [{ rotate: "0deg" }] },
	"20%": { transform: [{ rotate: "12deg" }] },
	"45%": { transform: [{ rotate: "-9deg" }] },
	"70%": { transform: [{ rotate: "5deg" }] },
	"100%": { transform: [{ rotate: "0deg" }] },
};
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
			<Animated.View
				key={total}
				style={{
					animationName: animate && total > 0 ? ring : undefined,
					animationDuration: motion.duration.reveal,
					animationIterationCount: 1,
				}}
			>
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
					<Animated.View
						key={total}
						style={{
							animationName: animate
								? {
										from: { opacity: 0, transform: [{ translateY: 4 }] },
										to: { opacity: 1, transform: [{ translateY: 0 }] },
									}
								: undefined,
							animationDuration: motion.duration.standard,
						}}
					>
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
