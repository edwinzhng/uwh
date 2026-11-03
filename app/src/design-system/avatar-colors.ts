import { type RainbowHue, rainbowSurface } from "./rainbow-palette";

const avatarHues: readonly RainbowHue[] = [
	"blue",
	"violet",
	"green",
	"yellow",
	"red",
	"orange",
	"indigo",
];

const avatarHash = (name: string): number =>
	Array.from(name.trim().toLowerCase().replace(/\s+/g, " ")).reduce(
		(value, character) =>
			(Math.imul(value, 31) + character.charCodeAt(0)) >>> 0,
		0,
	);

export const avatarColors = (
	name: string,
	mode: "light" | "dark" = "light",
): {
	background: string;
	foreground: string;
} => {
	const hash = avatarHash(name);
	return rainbowSurface(
		avatarHues.at(hash % avatarHues.length) ?? "blue",
		mode,
	);
};
