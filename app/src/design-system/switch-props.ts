export type SwitchProps = {
	label: string;
	description?: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
	isDisabled?: boolean;
	compact?: boolean;
};
