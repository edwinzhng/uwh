import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { CardAtmosphere } from "./card-atmosphere";
import { CardBackground } from "./card-background";
import { CardContentContext } from "./card-content-context";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const SpotlightCard = ({
	title,
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
		<CardContentContext value={true}>
			<View
				style={{
					borderColor: theme.border,
					borderWidth: geometry.border,
					borderRadius: corners.panel,
					padding: space.md,
					gap: space.sm,
					overflow: "hidden",
				}}
			>
				<CardBackground color={theme.background.card} />
				<CardAtmosphere />
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: space.sm,
						flexWrap: "wrap",
					}}
				>
					<Icon name="trophy" size="sm" tone="secondary" />
					<View style={{ flex: 1, minWidth: geometry.touch * 2 }}>
						<Text variant="overline" weight="semibold">
							{title}
						</Text>
					</View>
					{action}
				</View>
				{description ? <Text tone="secondary">{description}</Text> : undefined}
				{children}
			</View>
		</CardContentContext>
	);
};
