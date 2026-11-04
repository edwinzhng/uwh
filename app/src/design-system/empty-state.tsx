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
	<Stack gap={action ? "sm" : "xs"}>
		<Text variant="small" tone="secondary">
			{title}
		</Text>
		{description ? (
			<Text variant="small" tone="secondary">
				{description}
			</Text>
		) : undefined}
		{action ? <Row wrap>{action}</Row> : undefined}
	</Stack>
);
