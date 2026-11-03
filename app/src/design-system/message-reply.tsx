import type { ReactElement } from "react";
import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { corners, geometry, space } from "./tokens";

export const MessageReply = ({
	author,
	preview,
}: {
	author?: string;
	preview: string;
}): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				gap: space.xxs,
				paddingHorizontal: space.sm,
				paddingVertical: space.xs,
				borderRadius: corners.control,
				borderLeftWidth: geometry.focus,
				borderLeftColor: theme.controlBorder,
				backgroundColor: theme.background.secondary,
			}}
		>
			{author ? (
				<Text variant="caption" weight="semibold">
					{author}
				</Text>
			) : undefined}
			<Text variant="small" tone="secondary" lines={2}>
				{preview}
			</Text>
		</View>
	);
};
