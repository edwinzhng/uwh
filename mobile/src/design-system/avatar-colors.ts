import { chartColors } from "@calgarycrocs/design-system/tokens";
import { palette } from "./tokens";

export const avatarColors = (
	name: string,
): { background: string; foreground: string } => {
	const colors = Object.values(chartColors);
	const index = Array.from(name.trim().toLowerCase()).reduce(
		(hash, character) => (hash * 31 + character.charCodeAt(0)) % colors.length,
		0,
	);
	const background = (colors.at(index) ?? chartColors.blue).replace(
		/([\d.]+)%\)$/,
		(value): string => `${Math.min(Number.parseFloat(value), 32)}%)`,
	);
	return {
		background,
		foreground: palette.white,
	};
};
