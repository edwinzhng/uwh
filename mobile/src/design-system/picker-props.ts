import type { IconName } from "./icon";

export type StatusTone = "success" | "warning" | "danger";

export type ChoiceOption<T extends string> = {
	value: T;
	label: string;
	icon?: IconName;
	isDisabled?: boolean;
	tone?: StatusTone;
};

export type PickerProps<T extends string> = {
	label: string;
	value?: T;
	options: readonly ChoiceOption<T>[];
	onValueChange: (value: T | undefined) => void;
	placeholder?: string;
	isDisabled?: boolean;
};

export type MenuAction = {
	id: string;
	label: string;
	icon?: IconName;
	tone?: "default" | "danger";
	isDisabled?: boolean;
	onSelect: () => void;
};

export type MenuGroup = {
	id: string;
	label?: string;
	items: readonly MenuAction[];
};

export type ActionMenuProps = {
	label: string;
	icon?: IconName;
	groups: readonly MenuGroup[];
	isDisabled?: boolean;
};
