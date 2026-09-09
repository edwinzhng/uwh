import type { ReactElement, ReactNode } from "react";
import { Avatar } from "./avatar";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";

type Props = {
	title: string;
	description?: string;
	identity?: string;
	control?: ReactNode;
};
export const ContentRow = ({
	title,
	description,
	identity,
	control,
}: Props): ReactElement => (
	<Row align="center">
		{identity ? <Avatar name={identity} /> : undefined}
		<Stack gap="xxs" grow>
			<Text variant="label">{title}</Text>
			{description ? (
				<Text variant="small" tone="secondary">
					{description}
				</Text>
			) : undefined}
		</Stack>
		{control}
	</Row>
);
