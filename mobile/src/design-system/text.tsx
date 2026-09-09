import type { ReactElement, ReactNode } from "react";
import { Text as NativeText } from "react-native";
import { useTheme } from "./theme";
import { font, type TypographyVariant, typography } from "./tokens";

type Props = {
	children: ReactNode;
	variant?: TypographyVariant;
	tone?:
		| "primary"
		| "secondary"
		| "contrast"
		| "success"
		| "warning"
		| "danger";
	staffRole?: "coach" | "admin";
	align?: "left" | "center";
	selectable?: boolean;
	lines?: 1 | 2 | 3;
};

export const Text = ({
	children,
	variant = "body",
	tone = "primary",
	align = "left",
	selectable,
	staffRole,
	lines,
}: Props): ReactElement => {
	const theme = useTheme();
	const { family, ...style } = typography[variant];
	return (
		<NativeText
			selectable={selectable}
			numberOfLines={lines}
			accessibilityRole={variant.startsWith("h") ? "header" : undefined}
			style={{
				...style,
				fontFamily: font[family],
				color: staffRole
					? theme[staffRole].foreground
					: tone === "success" || tone === "warning" || tone === "danger"
						? theme[tone].foreground
						: theme.text[tone],
				textAlign: align,
			}}
		>
			{children}
		</NativeText>
	);
};
