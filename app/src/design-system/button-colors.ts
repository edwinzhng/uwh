import type { Theme } from "./tokens";
export type ButtonVariant =
	| "solid"
	| "secondary"
	| "ghost"
	| "selection"
	| "rsvp-yes"
	| "rsvp-no"
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
			border:
				variant === "secondary" ||
				variant === "rsvp-yes" ||
				variant === "rsvp-no"
					? theme.border
					: "transparent",
		};
	if (variant === "rsvp-yes" || variant === "rsvp-no") {
		const scale =
			theme.colorScales[variant === "rsvp-yes" ? "success" : "danger"];
		return {
			background: selected
				? scale.muted
				: interaction === "pressed"
					? theme.background.pressed
					: interaction === "hover"
						? theme.background.hover
						: "transparent",
			foreground: selected ? scale.text : theme.text.primary,
			border: selected ? scale.border : theme.controlBorder,
		};
	}
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
