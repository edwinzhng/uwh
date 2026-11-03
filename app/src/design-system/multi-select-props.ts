import type { ChoiceOption } from "./picker-props";

export type MultiSelectProps<T extends string> = {
	label: string;
	values: readonly T[];
	options: readonly ChoiceOption<T>[];
	onToggle: (value: T, selected: boolean) => void;
	isDisabled?: boolean;
	isBusy?: boolean;
	maxSelections?: number;
	placeholder?: string;
};
