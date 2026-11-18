import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { rainbowPalette } from "./rainbow-palette";
import { rolePalette } from "./role-glow";
import { useTheme } from "./theme";
import { font, radius, space, typography } from "./tokens";

export type Audience = "coaches" | "admins" | "personal" | "players" | "club";

const audienceText = {
	coaches: "Coaches only",
	admins: "Admins only",
	personal: "You, guardians and coaches",
	players: "Players can see",
	club: "Whole club",
} as const satisfies Record<Audience, string>;

const audiencePalette = (
	audience: Exclude<Audience, "personal">,
): { light: string; dark: string } =>
	audience === "coaches"
		? rolePalette("coach")
		: audience === "admins"
			? rolePalette("admin")
			: rainbowPalette.green;

export const AudienceLabel = ({
	audience,
	label,
}: {
	audience: Audience;
	label?: string;
}): ReactElement => {
	const theme = useTheme();
	const palette =
		audience === "personal" ? undefined : audiencePalette(audience);
	return (
		<View
			accessibilityLabel={`Who can see this: ${label ?? audienceText[audience]}`}
			style={{
				alignSelf: "flex-start",
				paddingHorizontal: space.xs,
				paddingVertical: space.half,
				borderRadius: radius.xs,
				backgroundColor: palette
					? palette[theme.mode]
					: theme.background.tertiary,
			}}
		>
			<Text
				style={{
					color: palette
						? palette[theme.mode === "dark" ? "light" : "dark"]
						: theme.text.secondary,
					fontFamily: font.medium,
					fontSize: typography.overline.fontSize,
					lineHeight: typography.overline.lineHeight,
				}}
			>
				{label ?? audienceText[audience]}
			</Text>
		</View>
	);
};
