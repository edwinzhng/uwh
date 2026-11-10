import { type ReactElement, type ReactNode, useContext } from "react";
import { Text as NativeText } from "react-native";
import { CardContentContext } from "./card-content-context";
import { useTheme } from "./theme";
import { font, type TypographyVariant, typography } from "./tokens";

type Props = {
	children: ReactNode;
	accessibilityLabel?: string;
	headingLevel?: 1 | 2 | 3;
	variant?: TypographyVariant;
	tone?:
		| "primary"
		| "secondary"
		| "contrast"
		| "onBrand"
		| "brand"
		| "highlight"
		| "onHighlight"
		| "success"
		| "warning"
		| "danger";
	align?: "left" | "center";
	selectable?: boolean;
	italic?: boolean;
	underline?: boolean;
	weight?: "regular" | "medium" | "semibold";
	lines?: 1 | 2 | 3;
};

export const Text = ({
	children,
	accessibilityLabel,
	headingLevel,
	variant = "body",
	tone = "primary",
	align = "left",
	selectable,
	italic = false,
	underline = false,
	weight,
	lines,
}: Props): ReactElement => {
	const theme = useTheme();
	const compact = useContext(CardContentContext);
	const compactVariant =
		compact && variant === "body"
			? "small"
			: compact && variant === "caption"
				? "overline"
				: variant;
	const { family, ...style } = typography[compactVariant];
	return (
		<NativeText
			accessibilityLabel={accessibilityLabel}
			selectable={selectable}
			numberOfLines={lines}
			accessibilityRole={
				headingLevel || variant.startsWith("h") ? "header" : undefined
			}
			aria-level={
				headingLevel ??
				(variant === "h1" ? 1 : variant.startsWith("h") ? 2 : undefined)
			}
			style={{
				...style,
				...(compact && variant === "caption"
					? ({ textTransform: "none", letterSpacing: 0 } as const)
					: {}),
				fontFamily:
					font[
						compact && variant === "number" ? "heading" : (weight ?? family)
					],
				fontStyle: italic ? "italic" : "normal",
				textDecorationLine: underline ? "underline" : undefined,
				color:
					tone === "onBrand"
						? theme.brand.foreground
						: tone === "highlight"
							? theme.highlight.text
							: tone === "onHighlight"
								? theme.highlight.foreground
								: tone === "brand"
									? theme.colorScales.accent.text
									: tone === "success" ||
											tone === "warning" ||
											tone === "danger"
										? theme[tone].foreground
										: theme.text[tone],
				textAlign: align,
			}}
		>
			{children}
		</NativeText>
	);
};
