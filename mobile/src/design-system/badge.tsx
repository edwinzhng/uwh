import type { ReactElement } from "react";
import { Text, View } from "react-native";
import { useTheme } from "./theme";
import { font, type Kind, radius, space, typography } from "./tokens";

type Props = { label: string; kind?: Kind; compact?: boolean };
export const Badge = ({
	label,
	kind = "neutral",
	compact = false,
}: Props): ReactElement => {
	const theme = useTheme();
	return (
		<View
			style={{
				alignSelf: compact ? "center" : "flex-start",
				backgroundColor: theme[kind].background,
				paddingHorizontal: compact ? space.xxs : space.xs,
				paddingVertical: compact ? space.none : space.half,
				borderRadius: radius.xs,
			}}
		>
			<Text
				style={{
					fontFamily: font.medium,
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
