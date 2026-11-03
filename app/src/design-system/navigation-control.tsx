import { LinearGradient } from "expo-linear-gradient";
import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useButtonHaptics } from "./haptics";
import { Icon, type IconName } from "./icon";
import { InteractionHighlight } from "./interaction-highlight";
import { NavigationHighlight } from "./navigation-highlight";
import { navigationGradient, navigationLabel } from "./navigation-model";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";
import { UnreadIndicator } from "./unread-indicator";

export type NavigationItem = {
	label: string;
	icon: IconName;
	selected: boolean;
	onPress: () => void;
	badge?: number;
	showOnPhone?: boolean;
};
export const NavigationControl = ({
	item,
	vertical = false,
	glass = false,
	sharedHover = false,
	onHoverChange,
}: {
	item: NavigationItem;
	vertical?: boolean;
	glass?: boolean;
	sharedHover?: boolean;
	onHoverChange?: (hovered: boolean) => void;
}): ReactElement => {
	const theme = useTheme();
	const haptic = useButtonHaptics();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityLabel={navigationLabel(item.label, item.badge)}
			accessibilityState={{ selected: item.selected }}
			aria-selected={item.selected}
			onPress={(): void => {
				item.onPress();
				haptic();
			}}
			onHoverIn={(): void => {
				setHovered(true);
				onHoverChange?.(true);
			}}
			onHoverOut={(): void => {
				setHovered(false);
				onHoverChange?.(false);
			}}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={({ pressed }) => ({
				flex: vertical ? 1 : undefined,
				minHeight: vertical ? geometry.tab : geometry.touch,
				justifyContent: "center",
				paddingHorizontal: vertical ? space.xxs : space.sm,
				paddingVertical: space.xs,
				borderRadius: vertical ? corners.pill : corners.navigation,
				backgroundColor: "transparent",
				borderWidth: !vertical && !glass ? geometry.border : 0,
				borderColor:
					!vertical && !glass && !item.selected && (hovered || pressed)
						? theme.border
						: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			{({ pressed }): ReactElement => {
				const gradient =
					vertical && !glass
						? navigationGradient(theme, item.selected, pressed || hovered)
						: undefined;
				return (
					<>
						{!item.selected ? (
							<InteractionHighlight
								active={(!sharedHover && hovered) || focused || pressed}
								color={theme.navigation.hover}
								radius={vertical ? corners.pill : corners.navigation}
							/>
						) : undefined}
						{gradient ? (
							<LinearGradient
								pointerEvents="none"
								colors={gradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 0, y: 1 }}
								style={StyleSheet.absoluteFill}
							/>
						) : undefined}
						{!vertical && !glass && item.selected ? (
							<NavigationHighlight />
						) : undefined}
						<View
							style={{
								flexDirection: vertical ? "column" : "row",
								alignItems: "center",
								justifyContent: vertical ? "center" : "flex-start",
								gap: vertical ? space.xxs : space.sm,
							}}
						>
							<View>
								<Icon
									name={item.icon}
									tone={
										item.selected || (!vertical && hovered)
											? "primary"
											: "secondary"
									}
								/>
								<UnreadIndicator count={item.badge} />
							</View>
							<Text
								variant={vertical ? "navigation" : "small"}
								tone={
									item.selected || (!vertical && hovered)
										? "primary"
										: "secondary"
								}
							>
								{item.label}
							</Text>
						</View>
					</>
				);
			}}
		</Pressable>
	);
};
