import type { ReactNode } from "react";
import type { IconName } from "./icon";

export type StatusTone = "success" | "warning" | "danger" | "pending";

export type ChoicePerson = { id?: string; name: string };

export type ChoiceOption<T extends string> = {
	value: T;
	label: string;
	isDisabled?: boolean;
	tone?: StatusTone;
} & (
	| { icon?: IconName; person?: never }
	| { person: ChoicePerson; icon?: never }
);

export type PickerProps<T extends string> = {
	listFooter?: ReactNode;
	appearance?: "field" | "context";
	hideLabel?: boolean;
	compact?: boolean;
	label: string;
	value?: T;
	options: readonly ChoiceOption<T>[];
	onValueChange: (value: T | undefined) => void;
	placeholder?: string;
	isDisabled?: boolean;
};

export type MenuAction = {
	checked?: boolean;
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
	accessibilityLabel?: string;
	compact?: boolean;
	label: string;
	icon?: IconName;
	groups: readonly MenuGroup[];
	isDisabled?: boolean;
};
