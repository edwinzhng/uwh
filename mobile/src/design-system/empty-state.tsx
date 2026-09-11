import type { ReactElement, ReactNode } from "react";
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
		<Text variant="h4">{title}</Text>
		<Text variant="small" tone="secondary">
			{description}
		</Text>
		{action}
	</Stack>
);
