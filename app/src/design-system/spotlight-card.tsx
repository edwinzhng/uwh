import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { CardBackground } from "./card-background";
import { FeatureIcon } from "./feature-icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const SpotlightCard = ({
	title,
	tone,
	children,
	action,
	description,
}: {
	title: string;
	tone: "violet" | "sky" | "fern";
	children?: ReactNode;
	action?: ReactNode;
	description?: string;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				borderColor: theme.border,
				borderWidth: geometry.border,
				borderRadius: corners.panel,
				padding: space.lg,
				gap: space.sm,
				overflow: "hidden",
			}}
		>
			<CardBackground color={theme.background.card} />
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: space.sm,
					flexWrap: "wrap",
				}}
			>
				<FeatureIcon name="trophy" category={tone} />
				<View style={{ flex: 1, minWidth: geometry.touch * 2 }}>
					<Text variant="h3">{title}</Text>
				</View>
				{action}
			</View>
			{description ? <Text tone="secondary">{description}</Text> : undefined}
			{children}
		</View>
	);
};
