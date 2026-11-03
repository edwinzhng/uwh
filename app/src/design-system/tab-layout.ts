import type { ScrollRange } from "./scroll-visibility";

export type TabSize = { width: number; height: number };
export type TabFrame = TabSize & { x: number; y: number };

type TabMeasurement<T extends string> = { value: T; size?: TabSize };

const measured = (size: TabSize | undefined): size is TabSize =>
	size !== undefined &&
	Number.isFinite(size.width) &&
	Number.isFinite(size.height) &&
	size.width > 0 &&
	size.height > 0;

export const tabFrame = <T extends string>(
	options: readonly TabMeasurement<T>[],
	value: T,
	gap: number,
): TabFrame | undefined => {
	const index = options.findIndex((option) => option.value === value);
	const size = options.at(index)?.size;
	const preceding = options.slice(0, index);
	if (
		index < 0 ||
		!measured(size) ||
		preceding.some((option) => !measured(option.size))
	)
		return undefined;
	const spacing = Number.isFinite(gap) ? Math.max(0, gap) : 0;
	return {
		x: preceding.reduce(
			(start, option) => start + (option.size?.width ?? 0) + spacing,
			0,
		),
		y: 0,
		width: size.width,
		height: size.height,
	};
};

export const tabScrollRange = (
	frame: TabFrame,
	contentInset: number,
	clearance: number,
): ScrollRange => {
	const inset = Number.isFinite(contentInset) ? Math.max(0, contentInset) : 0;
	return {
		start: inset + frame.x,
		end: inset + frame.x + frame.width,
		inset: clearance,
	};
};
