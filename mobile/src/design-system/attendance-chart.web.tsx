import { lazy, type ReactElement, Suspense } from "react";
import type { AttendancePoint } from "../domain/attendance-summary";
import { Text } from "./text";

const Plot = lazy(() =>
	import("./attendance-plot.web").then((module) => ({
		default: module.AttendanceChart,
	})),
);
export const AttendanceChart = ({
	data,
}: {
	data: AttendancePoint[];
}): ReactElement => (
	<Suspense
		fallback={
			<Text variant="small" tone="secondary">
				Loading chart…
			</Text>
		}
	>
		<Plot data={data} />
	</Suspense>
);
