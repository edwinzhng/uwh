export const watercolorRenderSize = (
	width: number,
	height: number,
): { width: number; height: number } => {
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width < 1 ||
		height < 1
	)
		throw new Error("A watercolor surface needs positive pixel dimensions.");
	const scale = Math.min(1, Math.sqrt(80000 / (width * height)));
	const renderWidth = Math.min(80000, Math.max(1, Math.floor(width * scale)));
	return {
		width: renderWidth,
		height: Math.min(
			Math.floor(80000 / renderWidth),
			Math.max(1, Math.floor(height * scale)),
		),
	};
};
