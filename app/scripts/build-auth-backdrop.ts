import { join } from "node:path";
import sharp from "sharp";

const assets = join(import.meta.dir, "..", "assets");
const input = join(assets, "auth-backdrop-source.jpg");
const output = process.argv.at(2) ?? join(assets, "auth-backdrop.jpg");

const canvas = { width: 1800, height: 3400 } as const;
const photo = { left: 450, top: 1000, cropTop: 6, width: 900, height: 594 };
const feather = 230;
const tile = { width: 38, height: 22, grout: 1.3 } as const;
const lane = { period: 368, width: 50, start: 287 } as const;
const bands = [83, 445] as const;
const bandHeight = 54;

type Rgb = [number, number, number];

const colors = {
	tile: [150, 192, 214],
	grout: [214, 232, 240],
	lane: [44, 92, 138],
	band: [52, 128, 196],
	light: [205, 240, 250],
} as const satisfies Record<string, Rgb>;

const smoothStep = (value: number): number => {
	const clamped = Math.min(1, Math.max(0, value));
	return clamped * clamped * (3 - 2 * clamped);
};

const wrap = (value: number, period: number): number =>
	((value % period) + period) % period;

const refraction = (x: number, y: number): [number, number] => [
	x +
		7 * Math.sin(y / 31 + 1.4 * Math.sin(x / 83)) +
		3 * Math.sin((x + y) / 19),
	y +
		5 * Math.sin(x / 37 + 1.2 * Math.sin(y / 67)) +
		2.5 * Math.sin((x - y) / 23),
];

const caustic = (
	x: number,
	y: number,
	scale: number,
	phase: number,
): number => {
	const px = x / scale - 250;
	const py = y / scale - 250;
	const intensity = 0.005;
	const steps = [0, 1, 2, 3, 4];
	const state = steps.reduce(
		(acc, step) => {
			const t = phase * (1 - 3.5 / (step + 1));
			const ix = px + Math.cos(t - acc.ix) + Math.sin(t + acc.iy);
			const iy = py + Math.sin(t - acc.iy) + Math.cos(t + acc.ix);
			const length = Math.hypot(
				px / (Math.sin(ix + t) / intensity),
				py / (Math.cos(iy + t) / intensity),
			);
			return { ix, iy, sum: acc.sum + 1 / length };
		},
		{ ix: px, iy: py, sum: 1 },
	);
	const value = 1.17 - (state.sum / steps.length) ** 1.4;
	return Math.min(1, Math.abs(value) ** 8);
};

const insideStripe = (
	value: number,
	start: number,
	period: number,
	size: number,
): number => {
	const position = wrap(value - start, period);
	return smoothStep((position + 2) / 3) * smoothStep((size - position + 2) / 3);
};

const groutLine = (value: number, size: number): number => {
	const position = wrap(value, size);
	const distance = Math.min(position, size - position);
	return 1 - smoothStep((distance - tile.grout * 0.5) / 1.2);
};

const poolPixel = (x: number, y: number): Rgb => {
	const sourceX = x - photo.left;
	const sourceY = y - photo.top + photo.cropTop;
	const [wx, wy] = refraction(sourceX, sourceY);
	const laneMix = insideStripe(wx, lane.start, lane.period, lane.width);
	const bandMix = Math.max(
		...bands.map((start) =>
			insideStripe(wy, start, canvas.height * 4, bandHeight),
		),
	);
	const grout = Math.max(
		groutLine(wx - lane.start, tile.width),
		groutLine(wy - bands[0], tile.height),
	);
	const light =
		0.9 * caustic(wx, wy, 40, 4.1) + 0.55 * caustic(wx + 900, wy, 72, 1.7);
	const shade = 0.82 + 0.18 * Math.sin(wx / 210 + Math.sin(wy / 330) * 2);
	const channel = (index: 0 | 1 | 2): number => {
		const base =
			colors.tile[index] * (1 - laneMix - bandMix * (1 - laneMix)) +
			colors.lane[index] * laneMix +
			colors.band[index] * bandMix * (1 - laneMix);
		const grouted =
			base * (1 - grout * 0.55) + colors.grout[index] * grout * 0.55;
		return grouted * shade * 0.78 + colors.light[index] * light * 0.6;
	};
	return [channel(0), channel(1), channel(2)];
};

const focus = { x: 485, y: 345, radiusX: 640, radiusY: 430, soften: 0.32 };

const focusAlpha = (x: number, y: number): number =>
	smoothStep(
		(1 -
			Math.hypot(
				(x - focus.x) / focus.radiusX,
				(y - focus.y) / focus.radiusY,
			)) /
			focus.soften,
	);

const photoAlpha = (x: number, y: number): number =>
	x < 0 || x >= photo.width || y < 0 || y >= photo.height
		? 0
		: focusAlpha(x, y) *
			smoothStep(
				Math.min(
					x / feather,
					(photo.width - 1 - x) / feather,
					y / feather,
					(photo.height - 1 - y) / feather,
				),
			);

const depthGrade = (x: number, y: number): Rgb => {
	const depth = Math.abs(y - (photo.top + photo.height / 2)) / canvas.height;
	const side = Math.abs(x - canvas.width / 2) / canvas.width;
	const fade = 1 - Math.min(0.6, depth * 1.1 + side * side * 0.8);
	return [0.66 * fade, 0.98 * fade, 0.92 * fade];
};

const channelMeans = (
	buffer: Buffer,
	width: number,
	left: number,
	top: number,
	regionWidth: number,
	regionHeight: number,
): Rgb => {
	const samples = Array.from(
		{ length: Math.floor(regionWidth / 4) * Math.floor(regionHeight / 4) },
		(_, sample) => {
			const columns = Math.floor(regionWidth / 4);
			const x = left + (sample % columns) * 4;
			const y = top + Math.floor(sample / columns) * 4;
			return (y * width + x) * 3;
		},
	);
	const mean = (channel: number): number =>
		samples.reduce(
			(sum, offset) => sum + (buffer.at(offset + channel) ?? 0),
			0,
		) / samples.length;
	return [mean(0), mean(1), mean(2)];
};

const source = await sharp(input)
	.extract({
		left: 0,
		top: photo.cropTop,
		width: photo.width,
		height: photo.height,
	})
	.raw()
	.toBuffer();

const rawPool = await sharp(
	Buffer.from(
		Array.from({ length: canvas.width * canvas.height }, (_, pixel) => {
			const x = pixel % canvas.width;
			return poolPixel(x, (pixel - x) / canvas.width);
		}).flatMap((rgb) => rgb.map((value) => Math.min(255, Math.round(value)))),
	),
	{ raw: { ...canvas, channels: 3 } },
)
	.blur(0.8)
	.raw()
	.toBuffer();

const photoMeans = channelMeans(source, photo.width, 0, 0, photo.width, 230);
const poolMeans = channelMeans(
	rawPool,
	canvas.width,
	photo.left,
	photo.top,
	photo.width,
	230,
);
const gains = photoMeans.map((value, channel) =>
	Math.min(1.6, Math.max(0.7, value / (poolMeans.at(channel) ?? value))),
);
const pool = Buffer.from(
	rawPool.map((value, index) =>
		Math.min(255, Math.round(value * (gains.at(index % 3) ?? 1))),
	),
);

const pixels = Buffer.from(
	Array.from({ length: canvas.width * canvas.height * 3 }, (_, index) => {
		const channel = index % 3;
		const pixel = (index - channel) / 3;
		const x = pixel % canvas.width;
		const y = (pixel - x) / canvas.width;
		const photoX = x - photo.left;
		const photoY = y - photo.top;
		const alpha = photoAlpha(photoX, photoY);
		const photoValue =
			alpha > 0
				? (source.at((photoY * photo.width + photoX) * 3 + channel) ?? 0)
				: 0;
		const mixed = photoValue * alpha + (pool.at(index) ?? 0) * (1 - alpha);
		return Math.min(
			255,
			Math.round(mixed * (depthGrade(x, y).at(channel) ?? 1)),
		);
	}),
);

await sharp(pixels, { raw: { ...canvas, channels: 3 } })
	.jpeg({ quality: 76, mozjpeg: true })
	.toFile(output);
