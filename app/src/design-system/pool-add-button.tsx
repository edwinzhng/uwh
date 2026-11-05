import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";
export const PoolAddButton = ({
	label,
	onPress,
}: {
	label: string;
	onPress?: () => void;
}): ReactElement => {
	const theme = useTheme();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			disabled={!onPress}
			onPress={onPress}
			hitSlop={space.sm}
			style={({ pressed }) => ({
				width: geometry.icon,
				height: geometry.icon,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.pill,
				borderWidth: geometry.border,
				borderStyle: "dotted",
				borderColor: theme.controlBorder,
				backgroundColor: pressed ? theme.background.pressed : "transparent",
			})}
		>
			<Icon name="plus" size="sm" />
		</Pressable>
	);
};
