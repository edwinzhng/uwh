import type { ReactElement } from "react";
import { View } from "react-native";
import { Button } from "./button";
import type { HistoryControlTreatment } from "./history-section-props";
import { Row } from "./row";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry } from "./tokens";

export const HistorySectionHeader = ({
	loadMore,
	loading,
	treatment = "heading",
}: {
	loadMore?: () => void;
	loading: boolean;
	treatment?: HistoryControlTreatment;
}): ReactElement => {
	const theme = useTheme();
	const action = loadMore ? (
		<Button
			label="Earlier"
			accessibilityLabel="Earlier practices"
			prefix="arrowUp"
			variant="ghost"
			density="filter"
			compact
			isLoading={loading}
			onPress={loadMore}
		/>
	) : undefined;
	const content =
		treatment === "divider" ? (
			<Row gap="sm">
				<View
					style={{
						flex: 1,
						height: geometry.border,
						backgroundColor: theme.border,
					}}
				/>
				<Text variant="caption" tone="secondary">
					Past
				</Text>
				{action}
				<View
					style={{
						flex: 1,
						height: geometry.border,
						backgroundColor: theme.border,
					}}
				/>
			</Row>
		) : (
			<Row justify={treatment === "heading" ? "between" : "start"} gap="xs">
				<Text
					variant={treatment === "heading" ? "h4" : "caption"}
					tone={treatment === "heading" ? "primary" : "secondary"}
				>
					Past
				</Text>
				{action}
			</Row>
		);
	return (
		<View style={{ minHeight: geometry.touch, justifyContent: "center" }}>
			{content}
		</View>
	);
};
