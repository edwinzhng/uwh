export const rainbowPalette = {
	red: { accent: "#F04452", light: "#FFE1E5", dark: "#421E25" },
	orange: { accent: "#FF8A28", light: "#FFE9D4", dark: "#432B18" },
	yellow: { accent: "#FFDA35", light: "#FFF3B8", dark: "#3D3515" },
	green: { accent: "#2DCE82", light: "#D4F7E6", dark: "#153B2C" },
	blue: { accent: "#0D4FF7", light: "#DFE8FF", dark: "#192C52" },
	indigo: { accent: "#6965F5", light: "#E6E4FF", dark: "#292449" },
	violet: { accent: "#B45CF0", light: "#F1DFFF", dark: "#372147" },
} as const;

export type RainbowHue = keyof typeof rainbowPalette;

export const rainbowSurface = (
	hue: RainbowHue,
	mode: "light" | "dark",
): { background: string; foreground: string } => ({
	background: rainbowPalette[hue][mode],
	foreground: rainbowPalette[hue][mode === "light" ? "dark" : "light"],
});

export const chartColors = {
	blue: rainbowPalette.blue.accent,
	red: rainbowPalette.red.accent,
	amber: rainbowPalette.yellow.accent,
	green: rainbowPalette.green.accent,
	indigo: rainbowPalette.indigo.accent,
	purple: rainbowPalette.violet.accent,
	orange: rainbowPalette.orange.accent,
} as const;
