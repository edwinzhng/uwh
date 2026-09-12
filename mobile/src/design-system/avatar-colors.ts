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
	const background = colors.at(index) ?? chartColors.blue;
	return {
		background,
		foreground:
			background === chartColors.purple ? palette.white : palette.black,
	};
};
