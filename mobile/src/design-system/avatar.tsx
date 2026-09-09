import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { avatarColors } from "./avatar-colors";
import { useTheme } from "./theme";
import { corners, font, geometry, typography } from "./tokens";

export const Avatar = ({ name }: { name: string }): ReactElement => {
	const theme = useTheme();
	const colors = avatarColors(theme, name);
	return (
		<View
			accessible={false}
			style={{
				width: geometry.avatar,
				height: geometry.avatar,
				borderRadius: corners.pill,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: colors.background,
			}}
		>
			<Text
				style={{
					fontFamily: font.medium,
					fontSize: typography.caption.fontSize,
					color: colors.foreground,
				}}
			>
				{name
					.trim()
					.split(/\s+/)
					.map((part) => part.at(0))
					.slice(0, 2)
					.join("")}
			</Text>
		</View>
	);
};
