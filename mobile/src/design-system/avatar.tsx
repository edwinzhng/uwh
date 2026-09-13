import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { avatarColors } from "./avatar-colors";
import { corners, font, geometry, typography } from "./tokens";

export const Avatar = ({
	name,
	compact = false,
}: {
	name: string;
	compact?: boolean;
}): ReactElement => {
	const colors = avatarColors(name);
	const size = compact ? 28 : geometry.avatar;
	return (
		<View
			accessible={false}
			style={{
				backgroundColor: colors.background,
				width: size,
				height: size,
				overflow: "hidden",
				borderRadius: corners.pill,
				alignItems: "center",
				justifyContent: "center",
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
