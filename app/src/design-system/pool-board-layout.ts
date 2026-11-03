export type PoolRowFrame = { y: number; height: number };
export type PoolDropFrame = {
	x: number;
	y: number;
	width: number;
	height: number;
};
export type PoolBoardDrag = {
	personId: string;
	scope: string;
	x: number;
	y: number;
};
export const poolBoardDropHighlighted = (
	drag: PoolBoardDrag | undefined,
	frame: PoolDropFrame | undefined,
	scope: string,
	occupantId?: string,
): boolean => {
	"worklet";
	return Boolean(
		drag &&
			frame &&
			drag.scope === scope &&
			drag.personId !== occupantId &&
			frame.width > 0 &&
			frame.height > 0 &&
			drag.x >= frame.x &&
			drag.x < frame.x + frame.width &&
			drag.y >= frame.y &&
			drag.y < frame.y + frame.height,
	);
};
export const poolBoardSpotAt = <T>(
	rows: readonly (readonly T[])[],
	frames: ReadonlyMap<number, PoolRowFrame>,
	width: number,
	x: number,
	y: number,
): T | undefined => {
	if (width <= 0 || x < 0 || x >= width || y < 0) return;
	const rowIndex = rows.findIndex((_, index) => {
		const frame = frames.get(index);
		return frame !== undefined && y >= frame.y && y < frame.y + frame.height;
	});
	const row = rows.at(rowIndex);
	if (rowIndex < 0 || !row?.length) return;
	return row.at(Math.floor(x / (width / row.length)));
};

export type PoolDropCandidate = {
	slotId: string;
	personId?: string;
	bounds?: PoolDropFrame;
};
export type PoolDropAction =
	| { kind: "add"; slotId: string }
	| { kind: "swap"; personId: string };
export const poolBoardDropAction = (
	candidates: readonly PoolDropCandidate[],
	x: number,
	y: number,
	draggedId: string,
	fallbackSlot: string,
): PoolDropAction | undefined => {
	const hit = candidates.find(
		({ bounds }) =>
			bounds &&
			x >= bounds.x &&
			x < bounds.x + bounds.width &&
			y >= bounds.y &&
			y < bounds.y + bounds.height,
	);
	if (hit?.personId)
		return hit.personId === draggedId
			? undefined
			: { kind: "swap", personId: hit.personId };
	return { kind: "add", slotId: hit?.slotId ?? fallbackSlot };
};
