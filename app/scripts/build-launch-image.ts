import { join } from "node:path";
import sharp from "sharp";
import { loadingColors } from "../src/design-system/loading-colors";
import {
	loadingWordmarkPath,
	loadingWordmarkViewBox,
} from "../src/design-system/loading-wordmark-path";
import { space, typography } from "../src/design-system/tokens";

const assets = join(import.meta.dir, "..", "assets");
const output = process.argv.at(2) ?? join(assets, "loading", "launch-pool.png");

const device = { width: 402, height: 874, safeTop: 62, pixelRatio: 3 } as const;
const photo = {
	path: join(assets, "auth-backdrop.jpg"),
	width: 1800,
	height: 3400,
	players: { x: 550, y: 1189, width: 770, height: 300 },
} as const;

const pixels = (points: number): number =>
	Math.round(points * device.pixelRatio);

const puckSize = Math.max(160, Math.min(device.width - space.md * 2, 320));
const wordmarkHeight = typography.h1.lineHeight;
const columnHeight = puckSize + space.sm + wordmarkHeight;
const puckTop = (device.height - columnHeight) / 2;
const contentTop = (device.height - puckSize) / 2;

const playersCenter = {
	x: photo.players.x + photo.players.width / 2,
	y: photo.players.y + photo.players.height / 2,
};
const photoScale = Math.max(
	Math.min(
		(device.width * 0.96) / photo.players.width,
		(device.height * 0.3) / photo.players.height,
	),
	device.width / 2 / playersCenter.x,
	device.width / 2 / (photo.width - playersCenter.x),
	(device.height * 0.6) / playersCenter.y,
	device.height / (photo.height - playersCenter.y),
);
const photoLeft = device.width / 2 - playersCenter.x * photoScale;
const photoTop =
	(device.safeTop + contentTop) / 2 - playersCenter.y * photoScale;

const canvas = { width: pixels(device.width), height: pixels(device.height) };
const placed = {
	left: pixels(photoLeft),
	top: pixels(photoTop),
	width: pixels(photo.width * photoScale),
	height: pixels(photo.height * photoScale),
};

const visible = {
	left: Math.max(0, -placed.left),
	top: Math.max(0, -placed.top),
	width: Math.min(placed.width, canvas.width - Math.max(0, placed.left)),
	height: Math.min(placed.height, canvas.height - Math.max(0, placed.top)),
};

const pool = await sharp(photo.path)
	.resize(placed.width, placed.height)
	.extract({
		left: visible.left,
		top: visible.top,
		width: Math.min(visible.width, placed.width - visible.left),
		height: Math.min(visible.height, placed.height - visible.top),
	})
	.toBuffer();

const scrim = Buffer.from(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><rect width="100%" height="100%" fill="${loadingColors.canvas}" fill-opacity="${loadingColors.poolScrimOpacity}"/></svg>`,
);

const puck = await sharp(join(assets, "loading", "loading-puck-dark.png"))
	.resize(pixels(puckSize), pixels(puckSize))
	.toBuffer();

const wordmark = Buffer.from(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${pixels(puckSize)}" height="${pixels(wordmarkHeight)}" viewBox="${loadingWordmarkViewBox}" preserveAspectRatio="xMidYMid meet"><path d="${loadingWordmarkPath}" fill="${loadingColors.text}"/></svg>`,
);

const puckLeft = pixels((device.width - puckSize) / 2);

await sharp({
	create: {
		width: canvas.width,
		height: canvas.height,
		channels: 3,
		background: loadingColors.canvas,
	},
})
	.composite([
		{
			input: pool,
			left: Math.max(0, placed.left),
			top: Math.max(0, placed.top),
		},
		{ input: scrim, left: 0, top: 0 },
		{ input: puck, left: puckLeft, top: pixels(puckTop) },
		{
			input: wordmark,
			left: puckLeft,
			top: pixels(puckTop + puckSize + space.sm),
		},
	])
	.png({ compressionLevel: 9, palette: true, quality: 90, dither: 0.6 })
	.toFile(output);

console.log(`Wrote ${output} (${canvas.width}x${canvas.height}).`);
