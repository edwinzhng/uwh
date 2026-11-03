import type { ReactElement, ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { Text } from "./text";
import { geometry, space } from "./tokens";

export const ChatIdentity = ({
	avatar,
	title,
}: {
	avatar: ReactNode;
	title: string;
}): ReactElement => {
	const { width } = useWindowDimensions();
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.xs,
				minWidth: 0,
				flexShrink: 1,
				maxWidth: Math.max(
					geometry.touch,
					width - geometry.touch * 3 - space.md * 2,
				),
				overflow: "hidden",
				minHeight: geometry.touch,
			}}
		>
			{avatar}
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text variant="label" weight="semibold" lines={1}>
					{title}
				</Text>
			</View>
		</View>
	);
};
