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
				minWidth: typography.caption.lineHeight,
				minHeight: typography.caption.lineHeight,
				paddingHorizontal: space.xxs,
				borderRadius: corners.control,
				backgroundColor: theme.navigation.unread,
			}}
		>
			<Text
				style={{
					fontFamily: font.semibold,
					fontSize: typography.caption.fontSize,
					lineHeight: typography.caption.lineHeight,
					color: theme.text.contrast,
				}}
			>
				{count >= 100 ? "99+" : count}
			</Text>
		</View>
	);
};
