import type { IconName } from "./icon";

export type SegmentOptionProps = {
	label: string;
	icon?: IconName;
	value: string;
	groupName: string;
	isSelected: boolean;
	isDisabled?: boolean;
	isTabStop: boolean;
	showSelection: boolean;
	height: number;
	onSelect: () => void;
	onHoverChange: (hovered: boolean) => void;
};
