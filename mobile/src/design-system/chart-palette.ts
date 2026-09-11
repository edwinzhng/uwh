import { chartColors } from "@calgarycrocs/design-system/tokens";

export const chartPalette = {
	...chartColors,
	onTime: chartColors.green,
	late: chartColors.amber,
	absent: chartColors.red,
	unmarked: "hsl(0, 0%, 76%)",
	series: [
		chartColors.blue,
		chartColors.purple,
		chartColors.teal,
		chartColors.amber,
		chartColors.pink,
		chartColors.green,
		chartColors.red,
		chartColors.gray,
	],
};
