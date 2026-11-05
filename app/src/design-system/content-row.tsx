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
	identityId?: string;
	compactIdentity?: boolean;
	control?: ReactNode;
	metadata?: ReactNode;
	headerAction?: ReactNode;
	titleVariant?: "label" | "small";
	titleLines?: 1 | 2 | 3;
	controlLayout?: "inline" | "responsive";
};
export const ContentRow = ({
	title,
	description,
	identity,
	identityId,
	compactIdentity = false,
	control,
	metadata,
	headerAction,
	titleVariant = "label",
	titleLines = 2,
	controlLayout = "inline",
}: Props): ReactElement => {
	const { fontScale } = useWindowDimensions();
	const [contentWidth, setContentWidth] = useState(0);
	const separateActions =
		controlLayout === "responsive" ? contentWidth < 600 * fontScale : false;
	const identityBlock = (
		<Stack gap="none" grow>
			<Row gap="xs">
				<View style={{ minWidth: 0, flexShrink: 1 }}>
					<Text variant={titleVariant} lines={titleLines}>
						{title}
					</Text>
				</View>
				{metadata}
				{separateActions && headerAction ? (
					<View style={{ marginLeft: "auto" }}>{headerAction}</View>
				) : undefined}
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
				gap: separateActions ? space.xxs : space.sm,
			}}
		>
			<View style={{ flex: separateActions ? undefined : 1, minWidth: 0 }}>
				<Row gap="xs">
					{identity ? (
						<Avatar
							name={identity}
							personId={identityId}
							mini={compactIdentity}
							initials
						/>
					) : undefined}
					{identityBlock}
				</Row>
			</View>
			{control}
			{!separateActions ? headerAction : undefined}
		</View>
	);
};
