import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";
import { font, radius, space, typography } from "./tokens";

export const UnreadCount = ({ count }: { count: number }): ReactElement => {
	const theme = useTheme();
	return (
		<View
			testID="club-unread-count"
			aria-hidden
			style={{
				alignSelf: "flex-end",
				alignItems: "center",
				justifyContent: "center",
				minWidth: typography.navigation.lineHeight + space.xs,
				minHeight: typography.navigation.lineHeight,
				paddingHorizontal: space.xxs,
				paddingVertical: space.half,
				borderRadius: radius.xs,
				flexShrink: 0,
				backgroundColor: theme.navigation.unread,
			}}
		>
			<Text
				style={{
					fontFamily: font.semibold,
					fontSize: typography.navigation.fontSize,
					lineHeight: typography.navigation.lineHeight,
					includeFontPadding: false,
					textAlign: "center",
					fontVariant: ["tabular-nums"],
					color: theme.text.contrast,
				}}
			>
				{count >= 100 ? "99+" : count}
			</Text>
		</View>
	);
};
