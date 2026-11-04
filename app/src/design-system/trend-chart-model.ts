import type { TrendSeries } from "./trend-chart-props";

export const trendDates = (series: TrendSeries[]): string[] =>
	[
		...new Set(
			series.flatMap((entry) => entry.points.map((point) => point.date)),
		),
	].sort();

export const trendPosition = (index: number, count: number): number =>
	count <= 1
		? 0.5
		: count < 4
			? (index + 1) / (count + 1)
			: 0.08 + (index / (count - 1)) * 0.84;

export const trendDomain = (
	series: TrendSeries[],
	maximum?: number,
): [number, number] => {
	if (maximum !== undefined) return [0, maximum];
	const values = series
		.flatMap((entry) => entry.points.map((point) => point.value))
		.filter(Number.isFinite);
	if (!values.length) return [0, 1];
	const min = Math.min(...values);
	const max = Math.max(...values);
	const padding = (max - min || Math.abs(max) || 1) * 0.15;
	return [Math.max(0, min - padding), max + padding];
};
