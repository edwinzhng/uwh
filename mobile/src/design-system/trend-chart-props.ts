export type TrendSeries = {
	id: string;
	label: string;
	points: { date: string; value: number }[];
};
export type TrendChartProps = {
	series: TrendSeries[];
	formatValue?: (value: number) => string;
};
