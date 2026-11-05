export const useControlSelection = <T extends string>(
	value: T,
	onValueChange: (value: T) => void,
): { selectedValue: T; selectValue: (next: T) => void } => ({
	selectedValue: value,
	selectValue: (next): void => {
		if (next !== value) onValueChange(next);
	},
});
