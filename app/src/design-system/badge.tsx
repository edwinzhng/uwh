import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";
import { font, geometry, type Kind, radius, space, typography } from "./tokens";

type Props = { label: string; kind?: Kind; compact?: boolean };
export const Badge = ({
	label,
	kind = "neutral",
	compact = false,
}: Props): ReactElement => {
	const theme = useTheme();
	const scale =
		kind === "success" ||
		kind === "warning" ||
		kind === "danger" ||
		kind === "pending"
			? theme.colorScales[kind]
			: undefined;
	return (
		<View
			style={{
				alignSelf: compact ? "center" : "flex-start",
				backgroundColor: theme[kind].background,
				borderWidth: geometry.border,
				borderColor: scale?.border ?? theme.border,
				paddingHorizontal: compact ? space.xxs : space.xs,
				paddingVertical: compact ? space.none : space.half,
				borderRadius: radius.xs,
			}}
		>
			<Text
				style={{
					fontFamily: font.semibold,
					fontSize: typography.caption.fontSize,
					lineHeight: typography.caption.lineHeight,
					color: theme[kind].foreground,
				}}
			>
				{label}
			</Text>
		</View>
	);
};
