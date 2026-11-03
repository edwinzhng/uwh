export type TrendSeries = {
	id: string;
	label: string;
	points: { date: string; value: number }[];
};
export type TrendChartProps = {
	series: TrendSeries[];
	maximum?: number;
	formatValue?: (value: number) => string;
};
