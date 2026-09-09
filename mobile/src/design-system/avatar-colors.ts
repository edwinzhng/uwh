import type { Theme } from "./tokens";

export const avatarColors = (
	theme: Theme,
	name: string,
): { background: string; foreground: string } => {
	const scales = Object.values(theme.colorScales);
	const index = Array.from(name.trim().toLowerCase()).reduce(
		(hash, character) => (hash * 31 + character.charCodeAt(0)) % scales.length,
		0,
	);
	const scale = scales.at(index) ?? theme.colorScales.accent;
	return { background: scale.muted, foreground: scale.text };
};
