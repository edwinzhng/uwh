import type { ReactElement } from "react";
import { Pressable } from "react-native";
import { Row } from "./row";
import { Text } from "./text";

type Props = {
	parentLabel: string;
	currentLabel: string;
	onParentPress: () => void;
};

export const Breadcrumbs = ({
	parentLabel,
	currentLabel,
	onParentPress,
}: Props): ReactElement => (
	<Row gap="sm" wrap>
		<Pressable accessibilityRole="link" onPress={onParentPress} hitSlop={8}>
			<Text variant="small">{parentLabel}</Text>
		</Pressable>
		<Text variant="small" tone="secondary">
			›
		</Text>
		<Text variant="small" tone="secondary">
			{currentLabel}
		</Text>
	</Row>
);
