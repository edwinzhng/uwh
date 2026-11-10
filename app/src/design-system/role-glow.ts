import { rainbowPalette } from "./rainbow-palette";
export type RoleTone = "coach" | "admin";
export const rolePalette = (
	role: RoleTone,
): { accent: string; light: string; dark: string } =>
	rainbowPalette[role === "coach" ? "blue" : "orange"];
export const roleGlow = (
	role: RoleTone,
	mode: "light" | "dark",
	inset = false,
): string => {
	const color = rolePalette(role).accent;
	return inset
		? `inset 0 0 0 1px ${color}66, inset 0 0 12px ${color}20`
		: `0 0 0 1px ${color}66, 0 0 20px ${color}${mode === "dark" ? "28" : "20"}`;
};
