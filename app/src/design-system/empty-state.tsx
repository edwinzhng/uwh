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
	description?: string;
	action?: ReactNode;
}): ReactElement => (
	<Stack gap="xs" padding="sm">
		<Text variant="label">{title}</Text>
		{description ? (
			<Text variant="small" tone="secondary">
				{description}
			</Text>
		) : undefined}
		{action ? <Row wrap>{action}</Row> : undefined}
	</Stack>
);
