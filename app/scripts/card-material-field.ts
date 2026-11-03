import { rainbowPalette } from "../src/design-system/rainbow-palette";
import type { CategoryColor } from "../src/design-system/tokens";
export type MaterialStyle = "pastel" | "watercolor";
export type MaterialMode = "light" | "dark";
export type Rgb = readonly [number, number, number];

const mix = (a: number, b: number, amount: number): number =>
	a + (b - a) * amount;
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
	const t = clamp(value);
	return t * t * (3 - 2 * t);
};
const noise = (x: number, y: number): number => {
	const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return value - Math.floor(value);
};
const valueNoise = (x: number, y: number): number => {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	return mix(
		mix(noise(ix, iy), noise(ix + 1, iy), smooth(x - ix)),
		mix(noise(ix, iy + 1), noise(ix + 1, iy + 1), smooth(x - ix)),
		smooth(y - iy),
	);
};

export const flowField = (x: number, y: number, time: number): number => {
	const detail = 2.3;
	const dx =
		x +
		Math.sin(y * detail * 1.7 + time * 0.8) * 0.12 +
		Math.cos(x * detail * 0.9 - time * 0.5) * 0.05;
	const dy =
		y +
		Math.cos(x * detail * 1.3 - time * 0.6) * 0.12 +
		Math.sin(y * detail * 1.1 + time * 0.7) * 0.05;
	const first = Math.sin(dx * detail * 2.1 + dy * detail * 1.8 + time * 0.4);
	const secondFrequency = detail * 2.1;
	const sx =
		dx +
		Math.cos(dy * secondFrequency * 2.7 - time * 0.45) * 0.07 +
		Math.sin(dx * secondFrequency * 1.9 + time * 0.6) * 0.04;
	const sy =
		dy +
		Math.sin(dx * secondFrequency * 2.3 + time * 0.65) * 0.07 +
		Math.cos(dy * secondFrequency * 1.6 - time * 0.4) * 0.04;
	const second = Math.cos(
		sx * secondFrequency * 1.4 - sy * secondFrequency * 1.9 + time * 0.35,
	);
	const thirdFrequency = detail * 3.7;
	const tx =
		sx +
		Math.sin(sy * thirdFrequency * 1.8 + time * 0.85) * 0.04 +
		Math.cos(sx * thirdFrequency * 1.3 - time * 0.55) * 0.025 +
		Math.sin((sx + sy) * thirdFrequency * 0.7 + time * 0.9) * 0.02;
	const ty =
		sy +
		Math.cos(sx * thirdFrequency * 1.6 - time * 0.75) * 0.04 +
		Math.sin(sy * thirdFrequency * 1.1 + time * 0.5) * 0.025 +
		Math.cos((sx + sy) * thirdFrequency * 0.8 - time * 0.95) * 0.02;
	return (
		first * 0.45 +
		second * 0.35 +
		Math.sin(
			tx * thirdFrequency * 1.1 + ty * thirdFrequency * 1.5 - time * 0.55,
		) *
			0.2
	);
};

type MaterialPalette = {
	swirl: readonly [Rgb, Rgb];
	wash: readonly [Rgb, Rgb, Rgb, Rgb, Rgb];
};
export const materialCategories = [
	"sky",
	"fern",
	"amber",
	"violet",
	"coral",
	"orange",
	"indigo",
] as const;
const materialHues = {
	sky: "blue",
	fern: "green",
	amber: "yellow",
	violet: "violet",
	coral: "red",
	orange: "orange",
	indigo: "indigo",
} as const;
const palettes: Record<CategoryColor, MaterialPalette> = {
	sky: {
		swirl: [
			[158, 209, 248],
			[98, 90, 197],
		],
		wash: [
			[71, 118, 230],
			[196, 77, 255],
			[255, 140, 66],
			[248, 187, 217],
			[248, 187, 217],
		],
	},
	fern: {
		swirl: [
			[188, 248, 158],
			[90, 197, 124],
		],
		wash: [
			[71, 230, 71],
			[255, 249, 77],
			[123, 188, 26],
			[194, 250, 147],
			[25, 176, 25],
		],
	},
	amber: {
		swirl: [
			[248, 212, 158],
			[255, 219, 77],
		],
		wash: [
			[230, 245, 239],
			[255, 219, 77],
			[255, 168, 97],
			[230, 245, 239],
			[255, 219, 77],
		],
	},
	violet: {
		swirl: [
			[233, 158, 248],
			[135, 73, 214],
		],
		wash: [
			[91, 45, 142],
			[142, 68, 173],
			[199, 125, 186],
			[232, 164, 208],
			[106, 27, 154],
		],
	},
	coral: {
		swirl: [
			[255, 209, 181],
			[209, 56, 56],
		],
		wash: [
			[255, 219, 77],
			[189, 51, 67],
			[242, 159, 107],
			[199, 125, 186],
			[232, 93, 44],
		],
	},
	orange: {
		swirl: [
			[248, 212, 158],
			[197, 90, 129],
		],
		wash: [
			[230, 245, 239],
			[255, 219, 77],
			[255, 168, 97],
			[230, 245, 239],
			[255, 168, 97],
		],
	},
	indigo: {
		swirl: [
			[158, 209, 248],
			[98, 90, 197],
		],
		wash: [
			[26, 10, 61],
			[107, 63, 160],
			[196, 166, 232],
			[142, 68, 173],
			[107, 63, 160],
		],
	},
};
const rgb = (hex: string): Rgb => [
	Number.parseInt(hex.slice(1, 3), 16),
	Number.parseInt(hex.slice(3, 5), 16),
	Number.parseInt(hex.slice(5, 7), 16),
];
const washAnchors = [
	{ x: 0.05, y: 0.1 },
	{ x: 0.9, y: 0.05 },
	{ x: 0.33, y: 0.85 },
	{ x: 0.95, y: 0.9 },
	{ x: 0.5, y: 0.5 },
];
const watercolor = (
	x: number,
	y: number,
	time: number,
	palette: MaterialPalette,
): Rgb => {
	const u =
		x +
		Math.sin(y * 5 + time) * 0.13 +
		(valueNoise(x * 3 + time * 0.15, y * 3) - 0.5) * 0.3;
	const v = y + Math.sin(x * 4 - time * 0.7) * 0.1;
	const points = washAnchors.map((point, index) => ({
		color: palette.wash.at(index) ?? palette.wash[0],
		weight: Math.exp(-((u - point.x) ** 2 + (v - point.y) ** 2) * 5),
	}));
	const total = points.reduce((sum, point) => sum + point.weight, 0);
	const channel = (index: 0 | 1 | 2): number =>
		points.reduce((sum, point) => sum + point.color[index] * point.weight, 0) /
		total;
	return [channel(0), channel(1), channel(2)];
};
export const materialPixel = (
	style: MaterialStyle,
	mode: MaterialMode,
	x: number,
	y: number,
	time: number,
	category: CategoryColor,
): Rgb => {
	const field = smooth((flowField(x, y, time) * 0.5 + 0.5 - 0.3) / 0.4);
	const paper =
		(noise(x * 1024, y * 1024) - 0.5) * (style === "watercolor" ? 40 : 2) +
		(style === "watercolor" ? (valueNoise(x * 96, y * 48) - 0.5) * 9 : 0);
	const palette = palettes[category];
	const pigment: Rgb =
		style === "watercolor"
			? watercolor(x, y, time, palette)
			: [
					mix(palette.swirl[0][0], palette.swirl[1][0], field),
					mix(palette.swirl[0][1], palette.swirl[1][1], field),
					mix(palette.swirl[0][2], palette.swirl[1][2], field),
				];
	const base = rgb(rainbowPalette[materialHues[category]][mode]);
	const strength = mode === "light" ? 0.35 : 0.1;
	const paperLift = style === "watercolor" && mode === "light" ? 6 : 0;
	const channel = (index: 0 | 1 | 2): number =>
		Math.round(
			Math.min(
				255,
				Math.max(
					0,
					mix(base[index], pigment[index], strength) + paper * 0.3 + paperLift,
				),
			),
		);
	return [channel(0), channel(1), channel(2)];
};
