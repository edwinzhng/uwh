import { space } from "./tokens";
export const categoryGridColumns = (
	availableWidth: number,
	fontScale: number,
	minimumCardWidth?: number,
): number =>
	fontScale >= 1.4 ||
	availableWidth < (minimumCardWidth ? minimumCardWidth * 2 + space.sm : 800)
		? 1
		: 2;
