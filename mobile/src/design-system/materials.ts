import type { Theme } from "./tokens";

export const materials = {
	light: {
		floating: "rgba(255,255,255,0.12)",
		selection: "rgba(13,79,247,0.12)",
		hover: "rgba(13,79,247,0.06)",
		pressed: "rgba(13,79,247,0.1)",
		refraction: "rgba(13,79,247,0.12)",
		border: "rgba(26,26,32,0.12)",
		edge: "rgba(255,255,255,0.95)",
		shine: "rgba(255,255,255,0.55)",
		rim: "inset 0 1px 1px rgba(255,255,255,0.95), inset 1px 0 1px rgba(255,255,255,0.72), inset 0 -1px 1px rgba(26,40,70,0.18), inset -1px 0 1px rgba(255,255,255,0.48)",
		selectionShadow:
			"0 2px 6px rgba(25,47,89,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
		shadow:
			"0 12px 32px rgba(20,30,50,0.12), 0 2px 5px rgba(20,30,50,0.06), 0 0 0 1px rgba(255,255,255,0.5)",
		overlayShadow:
			"0 24px 64px rgba(20,20,32,0.2), 0 4px 12px rgba(20,20,32,0.1), 0 0 0 1px rgba(255,255,255,0.6)",
	},
	dark: {
		floating: "rgba(24,28,38,0.25)",
		selection: "rgba(126,163,255,0.19)",
		hover: "rgba(160,187,255,0.08)",
		pressed: "rgba(160,187,255,0.14)",
		refraction: "rgba(90,128,255,0.16)",
		border: "rgba(255,255,255,0.2)",
		edge: "rgba(255,255,255,0.48)",
		shine: "rgba(255,255,255,0.15)",
		rim: "inset 0 1px 1px rgba(255,255,255,0.48), inset 1px 0 1px rgba(255,255,255,0.22), inset 0 -1px 1px rgba(0,0,0,0.5), inset -1px 0 1px rgba(153,183,255,0.2)",
		selectionShadow:
			"0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.36)",
		shadow: "0 8px 28px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.24)",
		overlayShadow:
			"0 24px 64px rgba(0,0,0,0.55), 0 0 24px rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.12)",
	},
	blur: { floating: 12 },
	intensity: { floating: 30 },
	saturation: 1.8,
} as const;

export type GlassMaterial = "floating" | "selection";

export const materialColors = (
	theme: Theme,
): (typeof materials)["light" | "dark"] =>
	theme.background.primary === "#FFFFFF" ? materials.light : materials.dark;
