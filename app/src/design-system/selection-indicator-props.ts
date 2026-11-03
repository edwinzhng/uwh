import type { TabFrame } from "./tab-layout";

export type SelectionIndicatorProps = {
	frame: TabFrame;
	value: string;
	color: string;
	radius: number;
	borderColor?: string;
};
