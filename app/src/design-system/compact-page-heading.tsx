import type { ReactElement, ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./text";
import { geometry, space } from "./tokens";

export const CompactPageHeading = ({
	title,
	subtitle,
	back,
	action,
	accessory,
	large = false,
}: {
	title?: string;
	subtitle?: string;
	back?: ReactNode;
	action?: ReactNode;
	accessory?: ReactNode;
	large?: boolean;
}): ReactElement => (
	<View
		style={{
			flexDirection: "row",
			alignItems: "center",
			flexWrap: "wrap",
			gap: space.xs,
		}}
	>
		{back}
		<View style={{ flex: 1, minWidth: geometry.touch * 2, gap: space.xxs }}>
			{title ? (
				<Text variant={large ? "h1" : "h4"} headingLevel={1}>
					{title}
				</Text>
			) : undefined}
			{subtitle ? (
				<Text variant="small" tone="secondary">
					{subtitle}
				</Text>
			) : undefined}
		</View>
		{accessory ? (
			<View style={{ maxWidth: "100%", flexShrink: 1 }}>{accessory}</View>
		) : undefined}
		{action ? (
			<View style={{ maxWidth: "100%", flexShrink: 1 }}>{action}</View>
		) : undefined}
	</View>
);
