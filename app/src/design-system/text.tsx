import type { ReactElement, ReactNode } from "react";
import { Text as NativeText } from "react-native";
import { useTheme } from "./theme";
import { font, type TypographyVariant, typography } from "./tokens";

type Props = {
	children: ReactNode;
	accessibilityLabel?: string;
	variant?: TypographyVariant;
	tone?:
		| "primary"
		| "secondary"
		| "contrast"
		| "onBrand"
		| "brand"
		| "success"
		| "warning"
		| "danger";
	align?: "left" | "center";
	selectable?: boolean;
	italic?: boolean;
	weight?: "regular" | "medium" | "semibold";
	lines?: 1 | 2 | 3;
};

export const Text = ({
	children,
	accessibilityLabel,
	variant = "body",
	tone = "primary",
	align = "left",
	selectable,
	italic = false,
	weight,
	lines,
}: Props): ReactElement => {
	const theme = useTheme();
	const { family, ...style } = typography[variant];
	return (
		<NativeText
			accessibilityLabel={accessibilityLabel}
			selectable={selectable}
			numberOfLines={lines}
			accessibilityRole={variant.startsWith("h") ? "header" : undefined}
			aria-level={
				variant === "h1" ? 1 : variant.startsWith("h") ? 2 : undefined
			}
			style={{
				...style,
				fontFamily: font[weight ?? family],
				fontStyle: italic ? "italic" : "normal",
				color:
					tone === "onBrand"
						? theme.brand.foreground
						: tone === "brand"
							? theme.colorScales.accent.text
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
