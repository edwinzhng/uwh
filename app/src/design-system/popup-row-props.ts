import type { IconName } from "./icon";
import type { ChoicePerson, StatusTone } from "./picker-props";

export type PopupRowProps = {
	label: string;
	icon?: IconName;
	person?: ChoicePerson;
	isSelected?: boolean;
	isChecked?: boolean;
	isDisabled?: boolean;
	tone?: "default" | StatusTone;
	onSelect: () => void;
};
