export type ScrollRange = { start: number; end: number; inset?: number };

export const pageTabInset = (
	viewportWidth: number,
	contentWidth: number,
	page: boolean,
): number =>
	page &&
	Number.isFinite(viewportWidth) &&
	Number.isFinite(contentWidth) &&
	contentWidth > 0
		? Math.max(0, (viewportWidth - contentWidth) / 2)
		: 0;

export const scrollOffsetToReveal = ({
	offset,
	viewportSize,
	contentSize,
	start,
	end,
	inset = 0,
}: ScrollRange & {
	offset: number;
	viewportSize: number;
	contentSize: number;
}): number => {
	if (
		!Number.isFinite(viewportSize) ||
		!Number.isFinite(contentSize) ||
		viewportSize <= 0 ||
		contentSize <= 0
	)
		return 0;
	const maximum = Math.max(0, contentSize - viewportSize);
	const clamp = (value: number): number =>
		Math.max(0, Math.min(maximum, value));
	const current = clamp(Number.isFinite(offset) ? offset : 0);
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
		return current;
	const padding = Number.isFinite(inset)
		? Math.max(0, Math.min(inset, viewportSize / 2))
		: 0;
	const first = Math.max(0, start - padding);
	const last = Math.min(contentSize, end + padding);
	if (last - first > viewportSize || first < current) return clamp(first);
	if (last > current + viewportSize) return clamp(last - viewportSize);
	return current;
};
