import type { Theme } from "./tokens";
export type ButtonVariant =
	| "solid"
	| "secondary"
	| "ghost"
	| "selection"
	| "danger"
	| "danger-text";
export type ButtonInteraction = "rest" | "hover" | "pressed" | "disabled";
export const buttonColors = (
	theme: Theme,
	variant: ButtonVariant,
	interaction: ButtonInteraction,
	selected = false,
): { background: string; foreground: string; border: string } => {
	if (interaction === "disabled")
		return {
			background:
				variant === "ghost" || variant === "danger-text"
					? "transparent"
					: theme.background.secondary,
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
	return {
		background: selected
			? theme.background.selected
			: interaction === "pressed"
				? theme.background.pressed
				: interaction === "hover"
					? theme.background.hover
					: variant === "selection"
						? theme.background.secondary
						: "transparent",
		foreground:
			variant === "danger-text" ? theme.danger.foreground : theme.text.primary,
		border:
			variant === "secondary" || selected
				? theme.controlBorder
				: variant === "selection"
					? theme.border
					: "transparent",
	};
};
