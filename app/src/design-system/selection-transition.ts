type Frame = { x: number; width: number };

export const selectionTransition = (
	previous: Frame,
	target: Frame,
	rendered: Frame,
): { x: number; scale: number } => ({
	x: rendered.x - target.x - (target.x - previous.x),
	scale: (rendered.width * previous.width) / (target.width * target.width),
});
