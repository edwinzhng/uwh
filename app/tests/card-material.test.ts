import { describe, expect, test } from "bun:test";
import { inflateSync } from "node:zlib";
import {
	categoryPalette,
	darkTheme,
	lightTheme,
	pageMaterialOpacity,
} from "../src/design-system/tokens";

type Rgb = readonly [number, number, number];
const rgb = (hex: string): Rgb => [
	Number.parseInt(hex.slice(1, 3), 16),
	Number.parseInt(hex.slice(3, 5), 16),
	Number.parseInt(hex.slice(5, 7), 16),
];
const luminance = (color: Rgb): number =>
	color.reduce((sum, value, index) => {
		const channel = value / 255;
		const linear =
			channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
		return (
			sum + linear * (index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722)
		);
	}, 0);
const contrast = (a: Rgb, b: Rgb): number => {
	const first = luminance(a);
	const second = luminance(b);
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};
const decode = async (name: string): Promise<Buffer> => {
	const png = Buffer.from(
		await Bun.file(
			`${import.meta.dir}/../assets/materials/${name}.png`,
		).arrayBuffer(),
	);
	const chunks: Buffer[] = [];
	const visit = (offset: number): void => {
		if (offset >= png.length) return;
		const length = png.readUInt32BE(offset);
		if (png.toString("ascii", offset + 4, offset + 8) === "IDAT")
			chunks.push(png.subarray(offset + 8, offset + 8 + length));
		visit(offset + length + 12);
	};
	visit(8);
	expect(png.readUInt32BE(16)).toBe(256);
	expect(png.readUInt32BE(20)).toBe(256);
	return inflateSync(Buffer.concat(chunks));
};

describe("bundled shader material readability", () => {
	for (const style of ["watercolor"] as const) {
		for (const mode of ["light", "dark"] as const) {
			test(`${style} ${mode}: category labels and page captions retain contrast through every blend`, async () => {
				const theme = mode === "light" ? lightTheme : darkTheme;
				for (const category of [
					"sky",
					"fern",
					"amber",
					"violet",
					"coral",
					"orange",
					"indigo",
				] as const) {
					const first = await decode(`${style}-${category}-${mode}-0`);
					const second = await decode(`${style}-${category}-${mode}-1`);
					const foreground = rgb(categoryPalette[mode][category].foreground);
					const pageInk = rgb(theme.text.secondary);
					const canvas = rgb(theme.background.canvas);
					const pageStrength = pageMaterialOpacity[mode];
					const minimum = Array.from({ length: 256 * 256 }, (_, index) => {
						const offset =
							Math.floor(index / 256) * 769 + 1 + (index % 256) * 3;
						return Math.min(
							...[0, 0.5, 1].flatMap((phase) => {
								const channel = (step: number): number =>
									(first.at(offset + step) ?? 0) * (1 - phase) +
									(second.at(offset + step) ?? 0) * phase;
								const background: Rgb = [channel(0), channel(1), channel(2)];
								const pageChannel = (step: 0 | 1 | 2): number =>
									canvas[step] * (1 - pageStrength) +
									background[step] * pageStrength;
								return [
									contrast(foreground, background),
									contrast(pageInk, [
										pageChannel(0),
										pageChannel(1),
										pageChannel(2),
									]),
								];
							}),
						);
					}).reduce(
						(lowest, value) => Math.min(lowest, value),
						Number.POSITIVE_INFINITY,
					);
					expect(minimum).toBeGreaterThanOrEqual(4.5);
					expect(first.equals(second)).toBe(false);
				}
			});
		}
	}
});
