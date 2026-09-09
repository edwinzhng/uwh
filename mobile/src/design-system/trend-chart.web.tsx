import { lazy, type ReactElement, Suspense } from "react";
import { Text } from "./text";
import type { TrendChartProps } from "./trend-chart-props";

const Plot = lazy(() =>
	import("./trend-plot.web").then((module) => ({ default: module.TrendChart })),
);
export const TrendChart = (props: TrendChartProps): ReactElement => (
	<Suspense fallback={<Text tone="secondary">Loading chart…</Text>}>
		<Plot {...props} />
	</Suspense>
);
