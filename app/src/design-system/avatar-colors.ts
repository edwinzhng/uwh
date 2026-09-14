import { chartColors } from "@calgarycrocs/design-system/tokens";
import { palette } from "./tokens";

export const avatarColors = (
	name: string,
): {
	background: string;
	foreground: string;
} => {
	const hash = Array.from(
		name.trim().toLowerCase().replace(/\s+/g, " "),
	).reduce(
		(value, character) =>
			(Math.imul(value, 31) + character.charCodeAt(0)) >>> 0,
		0,
	);
	return {
		background:
			Object.values(chartColors).at(hash % Object.values(chartColors).length) ??
			chartColors.blue,
		foreground: palette.white,
	};
};
