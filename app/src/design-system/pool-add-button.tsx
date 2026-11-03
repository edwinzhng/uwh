import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { Icon } from "./icon";
import { useTheme } from "./theme";
import { corners, geometry } from "./tokens";
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
			style={({ pressed }) => ({
				width: geometry.touch,
				height: geometry.touch,
				alignItems: "center",
				justifyContent: "center",
				borderRadius: corners.pill,
				borderWidth: geometry.border,
				borderStyle: "dotted",
				borderColor: theme.border,
				backgroundColor: pressed ? theme.background.pressed : "transparent",
			})}
		>
			<Icon name="plus" size="sm" />
		</Pressable>
	);
};
