import type { Theme } from "./tokens";

export type ButtonVariant =
	| "solid"
	| "secondary"
	| "ghost"
	| "selection"
	| "danger";
export type ButtonInteraction = "rest" | "hover" | "pressed" | "disabled";

export const buttonColors = (
	theme: Theme,
	variant: ButtonVariant,
	interaction: ButtonInteraction,
): { background: string; foreground: string; border: string } => {
	if (interaction === "disabled")
		return {
			background:
				variant === "ghost" ? "transparent" : theme.background.secondary,
			foreground: theme.text.secondary,
			border: variant === "secondary" ? theme.border : "transparent",
		};
	if (variant === "solid" || variant === "danger") {
		const colors = variant === "danger" ? theme.dangerAction : theme.accent;
		return {
			background:
				interaction === "rest" ? colors.background : colors[interaction],
			foreground: colors.foreground,
			border: "transparent",
		};
	}
	const restingBackground =
		variant === "ghost"
			? "transparent"
			: variant === "selection"
				? theme.background.tertiary
				: theme.background.secondary;
	return {
		background:
			interaction === "rest"
				? restingBackground
				: interaction === "pressed"
					? theme.background.pressed
					: variant === "ghost"
						? theme.background.secondary
						: theme.background.hover,
		foreground:
			variant === "ghost" && interaction === "rest"
				? theme.text.secondary
				: theme.text.primary,
		border: variant === "secondary" ? theme.border : "transparent",
	};
};
