import type { IconName } from "./icon";

export type SegmentOptionProps = {
	label: string;
	icon?: IconName;
	value: string;
	groupName: string;
	isSelected: boolean;
	indicatorReady?: boolean;
	isDisabled?: boolean;
	isTabStop: boolean;
	height: number;
	onSelect: () => void;
};
