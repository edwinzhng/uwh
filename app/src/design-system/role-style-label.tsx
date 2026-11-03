import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { rainbowPalette } from "./rainbow-palette";
import { type PreviewRole, roleDestinations } from "./role-style-preview-types";
import { useTheme } from "./theme";
import { font, radius, space, typography } from "./tokens";
export const RoleStyleLabel = ({
	roleKind,
}: {
	roleKind: PreviewRole;
}): ReactElement => {
	const theme = useTheme();
	const palette = rainbowPalette[roleKind === "coach" ? "violet" : "blue"];
	return (
		<View
			style={{
				alignSelf: "flex-start",
				paddingHorizontal: space.xs,
				paddingVertical: space.half,
				borderRadius: radius.xs,
				backgroundColor: palette[theme.mode],
			}}
		>
			<Text
				style={{
					color: palette[theme.mode === "dark" ? "light" : "dark"],
					fontFamily: font.medium,
					fontSize: typography.overline.fontSize,
					lineHeight: typography.overline.lineHeight,
				}}
			>
				{roleDestinations[roleKind].label}
			</Text>
		</View>
	);
};
