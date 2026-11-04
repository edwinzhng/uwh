import type { ReactElement } from "react";
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
			<span
				aria-hidden
				data-role-marker="dot"
				style={{
					display: "inline-block",
					flexShrink: 0,
					width: space.xxs + space.half,
					height: space.xxs + space.half,
					borderRadius: radius.round,
					background: palette.accent,
				}}
			/>
		);
	if (treatment === "underline")
		return (
			<span
				aria-hidden
				data-role-marker="underline"
				style={{
					position: "absolute",
					left: space.xs,
					right: space.xs,
					bottom: space.xxs,
					height: space.half,
					borderRadius: radius.xs,
					background: palette.accent,
				}}
			/>
		);
	return (
		<span
			aria-hidden
			data-role-marker="label"
			style={{
				padding: `${space.half}px ${space.xxs}px`,
				borderRadius: radius.xs,
				background: palette[theme.mode],
				fontFamily: font.medium,
				fontSize: typography.overline.fontSize,
				lineHeight: `${typography.overline.lineHeight}px`,
				color: palette[theme.mode === "dark" ? "light" : "dark"],
			}}
		>
			{role === "coach" ? "Coach" : "Admin"}
		</span>
	);
};
