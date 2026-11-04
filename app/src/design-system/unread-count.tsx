import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";
import { corners, font, space, typography } from "./tokens";

export const UnreadCount = ({ count }: { count: number }): ReactElement => {
	const theme = useTheme();
	return (
		<View
			aria-hidden
			style={{
				alignSelf: "flex-end",
				alignItems: "center",
				justifyContent: "center",
				minWidth: typography.navigation.lineHeight,
				height: typography.navigation.lineHeight,
				paddingHorizontal: space.half,
				borderRadius: corners.control,
				backgroundColor: theme.navigation.unread,
			}}
		>
			<Text
				style={{
					fontFamily: font.semibold,
					fontSize: typography.navigation.fontSize,
					lineHeight: typography.navigation.fontSize,
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
