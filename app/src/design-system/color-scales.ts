import type {
	ColorScale,
	SemanticColorScales,
} from "@uwhclub/design-system/tokens";
import { type RainbowHue, rainbowPalette } from "./rainbow-palette";

export type {
	ColorScale,
	SemanticColorScales,
} from "@uwhclub/design-system/tokens";

const rainbowScale = (hue: RainbowHue, mode: "light" | "dark"): ColorScale => {
	const color = rainbowPalette[hue];
	return {
		subtle: color[mode],
		muted: color[mode],
		border: color.accent,
		solid: color.accent,
		text: color[mode === "light" ? "dark" : "light"],
	};
};

export const lightColorScales = {
	pending: rainbowScale("blue", "light"),
	accent: {
		subtle: "#D8FF63",
		muted: "#D8FF63",
		border: "#697564",
		solid: "#182018",
		text: "#182018",
	},
	success: rainbowScale("green", "light"),
	warning: rainbowScale("orange", "light"),
	danger: rainbowScale("red", "light"),
	coach: rainbowScale("violet", "light"),
	admin: rainbowScale("yellow", "light"),
} satisfies SemanticColorScales;

export const darkColorScales = {
	pending: rainbowScale("blue", "dark"),
	accent: {
		subtle: "#313E1B",
		muted: "#313E1B",
		border: "#819078",
		solid: "#D8FF63",
		text: "#D8FF63",
	},
	success: rainbowScale("green", "dark"),
	warning: rainbowScale("orange", "dark"),
	danger: rainbowScale("red", "dark"),
	coach: rainbowScale("violet", "dark"),
	admin: rainbowScale("yellow", "dark"),
} satisfies SemanticColorScales;
