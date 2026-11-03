import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { NotificationMotion } from "./notification-motion";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

type NotificationBellProps = {
	count: number;
	countIsLimited?: boolean;
	label?: string;
	onPress: () => void;
};
export const NotificationBell = ({
	count,
	countIsLimited = false,
	label,
	onPress,
}: NotificationBellProps): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const total = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={
				countIsLimited
					? `Notifications, at least ${total} unread`
					: `Notifications, ${total} unread`
			}
			onPress={onPress}
			onHoverIn={(): void => setHovered(true)}
			onHoverOut={(): void => setHovered(false)}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				position: "relative",
				height: geometry.touch,
				width: label ? "100%" : geometry.touch,
				flexDirection: "row",
				gap: space.sm,
				paddingHorizontal: label ? space.sm : 0,
				alignItems: "center",
				justifyContent: label ? "flex-start" : "center",
				borderRadius: corners.pill,
				backgroundColor:
					hovered || pressed ? theme.background.hover : "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			<NotificationMotion count={total} kind="bell">
				<View style={{ position: "relative" }}>
					<Icon name="bell" size="sm" />
					{total > 0 ? (
						<View
							pointerEvents="none"
							accessible={false}
							style={{
								position: "absolute",
								right: -space.half,
								top: -space.half,
								width: space.xs,
								height: space.xs,
								borderRadius: corners.pill,
								backgroundColor: theme.navigation.unread,
								borderWidth: geometry.border,
								borderColor: theme.background.primary,
								alignItems: "center",
								justifyContent: "center",
								overflow: "hidden",
							}}
						/>
					) : undefined}
				</View>
			</NotificationMotion>
			{label ? (
				<Text variant="small" lines={1}>
					{label}
				</Text>
			) : undefined}
		</Pressable>
	);
};
