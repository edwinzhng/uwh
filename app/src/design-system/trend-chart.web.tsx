import { lazy, type ReactElement, Suspense } from "react";
import { Text } from "./text";
import { geometry } from "./tokens";
import type { TrendChartProps } from "./trend-chart-props";

const Plot = lazy(() =>
	import("./trend-plot.web").then((module) => ({ default: module.TrendChart })),
);
export const TrendChart = (props: TrendChartProps): ReactElement => (
	<Suspense
		fallback={
			<div style={{ height: geometry.chart }}>
				<Text tone="secondary">Loading chart…</Text>
			</div>
		}
	>
		<Plot {...props} />
	</Suspense>
);
