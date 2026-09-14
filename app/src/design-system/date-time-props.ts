type PickerProps = {
	label: string;
	value?: string;
	onValueChange: (value: string | undefined) => void;
	isDisabled?: boolean;
};

export type DatePickerProps = PickerProps & { min?: string; max?: string };
export type TimeSelectorProps = PickerProps;
