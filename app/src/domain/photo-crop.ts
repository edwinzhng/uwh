export type PhotoSource = { uri: string; width: number; height: number };
export type PhotoCrop = { x: number; y: number; zoom: number };
export type CropRectangle = {
	originX: number;
	originY: number;
	width: number;
	height: number;
};
export const defaultPhotoCrop: PhotoCrop = { x: 0.5, y: 0.5, zoom: 1 };
export const clampPhotoCrop = (crop: PhotoCrop): PhotoCrop => ({
	x: Math.min(1, Math.max(0, crop.x)),
	y: Math.min(1, Math.max(0, crop.y)),
	zoom: Math.min(3, Math.max(1, crop.zoom)),
});
export const photoCropRectangle = (
	source: Pick<PhotoSource, "width" | "height">,
	input: PhotoCrop,
): CropRectangle => {
	if (
		![source.width, source.height, input.x, input.y, input.zoom].every(
			Number.isFinite,
		) ||
		source.width < 1 ||
		source.height < 1
	)
		throw new Error("This photo could not be opened. Choose another photo.");
	const crop = clampPhotoCrop(input);
	const side = Math.max(
		1,
		Math.floor(Math.min(source.width, source.height) / crop.zoom),
	);
	return {
		originX: Math.round((source.width - side) * crop.x),
		originY: Math.round((source.height - side) * crop.y),
		width: side,
		height: side,
	};
};
export const movePhotoCrop = (
	source: Pick<PhotoSource, "width" | "height">,
	crop: PhotoCrop,
	dx: number,
	dy: number,
	viewport: number,
): PhotoCrop => {
	const rectangle = photoCropRectangle(source, crop);
	const scale = viewport / rectangle.width;
	const horizontal = (source.width - rectangle.width) * scale;
	const vertical = (source.height - rectangle.height) * scale;
	return clampPhotoCrop({
		...crop,
		x: horizontal > 0 ? crop.x - dx / horizontal : crop.x,
		y: vertical > 0 ? crop.y - dy / vertical : crop.y,
	});
};
