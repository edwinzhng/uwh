import type { ReactElement, ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { Avatar } from "./avatar";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { geometry } from "./tokens";

type Props = {
	title: string;
	description?: string;
	identity?: string;
	control?: ReactNode;
	metadata?: ReactNode;
	titleVariant?: "label" | "small";
};
export const ContentRow = ({
	title,
	description,
	identity,
	control,
	metadata,
	titleVariant = "label",
}: Props): ReactElement => {
	const { width } = useWindowDimensions();
	const separateActions = Boolean(metadata) && width < geometry.narrow;
	const identityBlock = (
		<Stack gap="xxs" grow>
			<Row gap="xs">
				<Text variant={titleVariant}>{title}</Text>
				{metadata}
			</Row>
			{description ? (
				<Text variant="small" tone="secondary">
					{description}
				</Text>
			) : undefined}
		</Stack>
	);
	return separateActions ? (
		<Stack gap="xs">
			{identityBlock}
			<Row justify="end">{control}</Row>
		</Stack>
	) : (
		<Row align="center">
			{identity ? <Avatar name={identity} /> : undefined}
			{identityBlock}
			{control}
		</Row>
	);
};
