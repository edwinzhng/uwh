import { rainbowPalette } from "./rainbow-palette";
export type RoleTone = "coach" | "admin";
export const roleGlow = (role: RoleTone, mode: "light" | "dark"): string => {
	const color = rainbowPalette[role === "coach" ? "violet" : "blue"].accent;
	return `0 0 0 1px ${color}40, 0 0 20px ${color}${mode === "dark" ? "20" : "16"}`;
};
