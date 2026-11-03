export const categoryGridColumns = (
	availableWidth: number,
	fontScale: number,
): number => (fontScale >= 1.4 || availableWidth < 800 ? 1 : 2);
