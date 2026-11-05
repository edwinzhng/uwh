import type { ReactElement } from "react";
import { View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const MessageEmptyState = (): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				padding: space.xl,
				gap: space.sm,
			}}
		>
			<View
				accessible={false}
				style={{
					width: geometry.avatar * 2,
					height: geometry.avatar * 2,
					borderRadius: corners.pill,
					backgroundColor: theme.background.secondary,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Icon name="message" color={theme.text.secondary} />
			</View>
			<Text variant="small" tone="secondary" align="center">
				No messages yet
			</Text>
		</View>
	);
};
