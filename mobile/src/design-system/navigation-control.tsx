import { type ReactElement, useState } from "react";
import { Pressable, View } from "react-native";
import { Badge } from "./badge";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export type NavigationItem = {
	label: string;
	icon: IconName;
	selected: boolean;
	onPress: () => void;
	badge?: number;
};
export const NavigationControl = ({
	item,
	vertical = false,
	onHoverChange,
}: {
	item: NavigationItem;
	vertical?: boolean;
	onHoverChange?: (hovered: boolean) => void;
}): ReactElement => {
	const theme = useTheme();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityLabel={
				item.badge
					? `${item.label}, ${item.badge} unread conversations`
					: item.label
			}
			accessibilityState={{ selected: item.selected }}
			onPress={item.onPress}
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
				borderRadius: vertical ? corners.pill : corners.item,
				backgroundColor: vertical
					? "transparent"
					: item.selected
						? theme.background.selected
						: hovered || pressed
							? theme.background.hover
							: "transparent",
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
			})}
		>
			<View
				style={{
					flexDirection: vertical ? "column" : "row",
					alignItems: "center",
					justifyContent: vertical ? "center" : "flex-start",
					gap: vertical ? space.xxs : space.sm,
				}}
			>
				<View
					style={{ flexDirection: "row", alignItems: "center", gap: space.xxs }}
				>
					<Icon
						name={item.icon}
						tone={item.selected ? "primary" : "secondary"}
					/>
					{item.badge ? (
						<Badge
							label={item.badge > 99 ? "99+" : String(item.badge)}
							kind="info"
						/>
					) : undefined}
				</View>
				<Text
					variant={vertical ? "caption" : "label"}
					tone={item.selected ? "primary" : "secondary"}
				>
					{item.label}
				</Text>
			</View>
		</Pressable>
	);
};
