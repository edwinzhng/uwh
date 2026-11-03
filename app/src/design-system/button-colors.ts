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
): { background: string; foreground: string; border: string; base: string } => {
	const base =
		interaction === "disabled"
			? theme.border
			: variant === "solid"
				? theme.accent.pressed
				: variant === "danger"
					? theme.dangerAction.pressed
					: theme.background.pressed;
	if (interaction === "disabled")
		return {
			base,
			background:
				variant === "ghost" || variant === "danger-text"
					? "transparent"
					: theme.background.secondary,
			foreground: theme.text.secondary,
			border: variant === "secondary" ? theme.controlBorder : "transparent",
		};
	if (variant === "danger-text" || variant === "ghost")
		return {
			base: "transparent",
			background: "transparent",
			foreground:
				variant === "danger-text"
					? theme.danger.foreground
					: theme.text.primary,
			border: "transparent",
		};
	if (variant === "solid" || variant === "danger") {
		const colors = variant === "danger" ? theme.dangerAction : theme.accent;
		return {
			base,
			background:
				interaction === "rest" ? colors.background : colors[interaction],
			foreground: colors.foreground,
			border: "transparent",
		};
	}
	return {
		base,
		background:
			interaction === "rest"
				? variant === "selection"
					? theme.background.tertiary
					: theme.background.primary
				: interaction === "pressed"
					? variant === "secondary"
						? theme.background.tertiary
						: theme.background.pressed
					: variant === "secondary"
						? theme.background.secondary
						: theme.background.hover,
		foreground: theme.text.primary,
		border: variant === "secondary" ? theme.controlBorder : "transparent",
	};
};
