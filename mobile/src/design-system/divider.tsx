import type { ReactElement } from "react";
import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const Divider = ({
	label,
	tone = "secondary",
}: {
	label?: string;
	tone?: "primary" | "secondary";
}): ReactElement => {
	const theme = useTheme();
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
			<View
				style={{
					flex: 1,
					height: geometry.border,
					backgroundColor: theme.border,
				}}
			/>
			{label ? (
				<Text variant="small" tone={tone}>
					{label}
				</Text>
			) : undefined}
			{label ? (
				<View
					style={{
						flex: 1,
						height: geometry.border,
						backgroundColor: theme.border,
					}}
				/>
			) : undefined}
		</View>
	);
};
