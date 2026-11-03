import { createContext, useContext } from "react";

export type GlassTreatment = "satin" | "clear";
export const GlassPreviewContext = createContext<GlassTreatment | undefined>(
	"clear",
);
export const useGlassPreview = (): GlassTreatment | undefined =>
	useContext(GlassPreviewContext);

export const previewGlassColors = (
	dark: boolean,
	treatment: GlassTreatment,
): { fill: string; edge: string; highlight: string; rim: string } => ({
	fill: dark
		? `rgba(25,30,37,${treatment === "clear" ? 0.62 : 0.82})`
		: `rgba(255,255,255,${treatment === "clear" ? 0.6 : 0.82})`,
	edge: dark ? "rgba(184,205,235,0.24)" : "rgba(65,81,102,0.2)",
	highlight: dark ? "rgba(221,234,255,0.13)" : "rgba(255,255,255,0.8)",
	rim: dark
		? "inset 0 1px 1px rgba(225,237,255,0.3), inset 1px 0 2px rgba(225,237,255,0.12), inset 0 -1px 1px rgba(100,120,150,0.12)"
		: "inset 0 1px 1px rgba(255,255,255,0.95), inset 1px 0 2px rgba(255,255,255,0.7), inset 0 -1px 1px rgba(65,81,102,0.08)",
});
