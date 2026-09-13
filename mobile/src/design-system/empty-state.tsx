import type { ReactElement, ReactNode } from "react";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

export const EmptyState = ({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}): ReactElement => (
	<Stack gap="xs" padding="lg">
		<Text variant="label" align="center">
			{title}
		</Text>
		<Text variant="body" tone="secondary" align="center">
			{description}
		</Text>
		{action ? <Row justify="center">{action}</Row> : undefined}
	</Stack>
);
