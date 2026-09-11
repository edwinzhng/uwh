export const materials = {
	light: {
		floating: "rgba(218,222,225,0.28)",
		selection: "rgba(255,255,255,0.72)",
		hover: "rgba(0,0,0,0.035)",
		pressed: "rgba(0,0,0,0.065)",
		border: "rgba(0,0,0,0.08)",
		shine: "rgba(255,255,255,0.16)",
		rim: "inset 0 1px 0 rgba(255,255,255,0.95), inset 1px 0 1px rgba(255,255,255,0.65), inset 0 -1px 1px rgba(0,0,0,0.12), inset 0 0 7px rgba(255,255,255,0.4)",
		selectionShadow: "0 1px 3px rgba(0,0,0,0.06)",
		shadow: "0 4px 14px rgba(20,30,40,0.08), 0 1px 3px rgba(20,30,40,0.05)",
		overlayShadow:
			"0 24px 64px rgba(20,20,32,0.2), 0 4px 12px rgba(20,20,32,0.1), 0 0 0 1px rgba(255,255,255,0.6)",
	},
	dark: {
		floating: "rgba(32,32,32,0.20)",
		selection: "rgba(255,255,255,0.12)",
		hover: "rgba(255,255,255,0.05)",
		pressed: "rgba(255,255,255,0.09)",
		border: "rgba(255,255,255,0.2)",
		shine: "rgba(255,255,255,0.04)",
		rim: "inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
		selectionShadow: "0 1px 3px rgba(0,0,0,0.16)",
		shadow: "0 8px 28px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.24)",
		overlayShadow:
			"0 24px 64px rgba(0,0,0,0.55), 0 0 24px rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.18)",
	},
	blur: { floating: 8 },
	intensity: { floating: 30 },
	saturation: 1.15,
} as const;

export type GlassMaterial = "floating" | "selection";
