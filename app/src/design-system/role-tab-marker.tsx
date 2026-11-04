import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { rainbowPalette } from "./rainbow-palette";
import type { RoleTone } from "./role-glow";
import type { RoleTabTreatment } from "./role-tab-treatment";
import { useTheme } from "./theme";
import { font, radius, space, typography } from "./tokens";

type Props = { role: RoleTone; treatment: Exclude<RoleTabTreatment, "glow"> };
export const RoleTabMarker = ({ role, treatment }: Props): ReactElement => {
	const theme = useTheme();
	const palette = rainbowPalette[role === "coach" ? "violet" : "blue"];
	if (treatment === "dot")
		return (
			<View
				accessible={false}
				style={{
					width: space.xxs + space.half,
					height: space.xxs + space.half,
					borderRadius: radius.round,
					backgroundColor: palette.accent,
				}}
			/>
		);
	if (treatment === "underline")
		return (
			<View
				accessible={false}
				style={{
					position: "absolute",
					left: space.xs,
					right: space.xs,
					bottom: space.xxs,
					height: space.half,
					borderRadius: radius.xs,
					backgroundColor: palette.accent,
				}}
			/>
		);
	return (
		<View
			accessible={false}
			style={{
				paddingHorizontal: space.xxs,
				paddingVertical: space.half,
				borderRadius: radius.xs,
				backgroundColor: palette[theme.mode],
			}}
		>
			<Text
				style={{
					fontFamily: font.medium,
					fontSize: typography.overline.fontSize,
					lineHeight: typography.overline.lineHeight,
					color: palette[theme.mode === "dark" ? "light" : "dark"],
				}}
			>
				{role === "coach" ? "Coach" : "Admin"}
			</Text>
		</View>
	);
};
