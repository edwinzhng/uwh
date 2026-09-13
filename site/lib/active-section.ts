export const activeSectionForScroll = (
	tops: Array<number | undefined>,
	threshold: number,
	current: number | undefined,
): number | undefined => {
	const candidate = tops.reduce<number | undefined>(
		(active, top, index): number | undefined =>
			top !== undefined && top <= threshold ? index : active,
		undefined,
	);
	const currentTop = current === undefined ? undefined : tops.at(current);
	return current !== undefined &&
		(candidate === undefined || candidate < current) &&
		currentTop !== undefined &&
		currentTop <= threshold + 48
		? current
		: candidate;
};
