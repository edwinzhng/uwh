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
	divider = true,
	compact = false,
	children,
}: {
	label: string;
	divider?: boolean;
	compact?: boolean;
	description?: string;
	tone?: "neutral" | "success" | "danger" | "warning";
	children: ReactNode;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				paddingTop: compact && !divider ? 0 : space.xxs,
				paddingBottom: space.xxs,
				borderTopWidth: divider ? geometry.border : 0,
				borderColor: theme.border,
				borderRadius: 0,
				backgroundColor: "transparent",
			}}
		>
			<Row gap="xs">
				<Stack grow gap="none">
					<Text
						variant="small"
						weight="medium"
						lines={2}
						tone={tone === "neutral" ? "primary" : tone}
					>
						{label}
						{description ? (
							<Text
								variant="caption"
								weight="regular"
								tone="secondary"
							>{`\u00a0· ${description.replace(/–/g, "\u2060–\u2060")}`}</Text>
						) : undefined}
					</Text>
				</Stack>
				{children}
			</Row>
		</View>
	);
};
