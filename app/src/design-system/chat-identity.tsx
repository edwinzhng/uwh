import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./theme";
import { geometry, space } from "./tokens";

export const ChatIdentity = ({
	avatar,
	title,
	onPress,
}: {
	avatar: ReactNode;
	title: string;
	onPress?: () => void;
}): ReactElement => {
	const { width } = useWindowDimensions();
	const theme = useTheme();
	const [focused, setFocused] = useState(false);
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`Chat settings · ${title}`}
			onFocus={(): void => setFocused(true)}
			onBlur={(): void => setFocused(false)}
			style={{
				outlineWidth: focused ? geometry.focus : 0,
				outlineColor: theme.focus,
				outlineOffset: -geometry.focus,
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
		</Pressable>
	);
};
