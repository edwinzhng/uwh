import { materials as sharedMaterials } from "@calgarycrocs/design-system/materials";

export type { GlassMaterial } from "@calgarycrocs/design-system/materials";
export const materials = {
	...sharedMaterials,
	blur: { ...sharedMaterials.blur, floating: 16 },
	light: {
		...sharedMaterials.light,
		floating: "rgba(250,250,244,0.76)",
		selection: "rgba(227,235,200,0.78)",
	},
	dark: {
		...sharedMaterials.dark,
		floating: "rgba(28,37,28,0.78)",
		selection: "rgba(216,255,99,0.12)",
	},
};

import { elevation, type Theme } from "./tokens";

type MaterialColors = {
	[Key in keyof (typeof materials)["light"]]: string;
};

export const materialColors = (theme: Theme): MaterialColors => ({
	...(theme.mode === "light" ? materials.light : materials.dark),
	shadow: elevation.floating.boxShadow,
	overlayShadow: elevation.overlay.boxShadow,
});
