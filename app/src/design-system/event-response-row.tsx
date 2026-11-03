import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const EventResponseRow = ({
	label,
	description,
	tone = "neutral",
	children,
}: {
	label: string;
	description?: string;
	tone?: "neutral" | "success" | "danger" | "warning";
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				paddingVertical: space.xs,
				borderTopWidth: geometry.border,
				borderColor: theme.border,
				borderRadius: 0,
				backgroundColor:
					tone === "neutral" ? "transparent" : theme[tone].background,
			}}
		>
			<Row gap="xs">
				<Stack grow gap="none">
					<Text variant="small" weight="medium">
						{label}
					</Text>
					{description ? (
						<Text variant="caption" tone="secondary">
							{description}
						</Text>
					) : undefined}
				</Stack>
				{children}
			</Row>
		</View>
	);
};
