export const edgeFadeLocations = (
	height: number,
	tail: number,
	edge: "top" | "bottom",
): [number, number, number] => {
	const fraction = height > 0 ? Math.min(1, Math.max(0, tail) / height) : 0;
	return edge === "top" ? [0, 1 - fraction, 1] : [0, fraction, 1];
};
export const messageFadeLocations = (
	height: number,
	inset: number,
): [number, number, number, number] => {
	const fraction = height > 0 ? Math.min(0.5, Math.max(0, inset) / height) : 0;
	return [0, fraction, 1 - fraction, 1];
};
