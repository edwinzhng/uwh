import { type ReactElement, type ReactNode, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Avatar } from "./avatar";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { space } from "./tokens";

type Props = {
	title: string;
	description?: string;
	identity?: string;
	control?: ReactNode;
	metadata?: ReactNode;
	titleVariant?: "label" | "small";
	titleLines?: 1 | 2 | 3;
	controlLayout?: "inline" | "responsive";
};
export const ContentRow = ({
	title,
	description,
	identity,
	control,
	metadata,
	titleVariant = "label",
	titleLines = 2,
	controlLayout = "inline",
}: Props): ReactElement => {
	const { width, fontScale } = useWindowDimensions();
	const [contentWidth, setContentWidth] = useState(0);
	const separateActions =
		controlLayout === "responsive"
			? contentWidth < 600 * fontScale
			: Boolean(metadata) && width < 400;
	const identityBlock = (
		<Stack gap="none" grow>
			<Row gap="xs">
				<Stack grow gap="none">
					<Text variant={titleVariant} lines={titleLines}>
						{title}
					</Text>
				</Stack>
				{metadata}
			</Row>
			{description ? (
				<Text variant="small" tone="secondary">
					{description}
				</Text>
			) : undefined}
		</Stack>
	);
	return (
		<View
			onLayout={(event): void =>
				setContentWidth(event.nativeEvent.layout.width)
			}
			style={{
				flexDirection: separateActions ? "column" : "row",
				alignItems: separateActions ? "stretch" : "center",
				gap: space.sm,
			}}
		>
			<View style={{ flex: separateActions ? undefined : 1, minWidth: 0 }}>
				<Row>
					{identity ? <Avatar name={identity} /> : undefined}
					{identityBlock}
				</Row>
			</View>
			{control}
		</View>
	);
};
