import type { ReactElement } from "react";
import { Text } from "react-native";
import { useTheme } from "./theme";
import { font, typography } from "./tokens";

export const EditorialQuote = ({
	text,
	quoted = true,
}: {
	text: string;
	quoted?: boolean;
}): ReactElement => {
	const theme = useTheme();
	const { family, ...style } = typography.h3;
	return (
		<Text
			numberOfLines={3}
			style={{
				...style,
				fontFamily: font.medium,
				color: theme.text.primary,
			}}
		>
			{quoted ? `“${text.trim()}”` : text}
		</Text>
	);
};
