import { useLayoutEffect, useState, useTransition } from "react";

export const useControlSelection = <T extends string>(
	value: T,
	onValueChange: (value: T) => void,
): { selectedValue: T; selectValue: (next: T) => void } => {
	const [selectedValue, setSelectedValue] = useState(value);
	const [pending, startTransition] = useTransition();
	useLayoutEffect((): void => {
		if (!pending) setSelectedValue(value);
	}, [pending, value]);
	return {
		selectedValue,
		selectValue: (next): void => {
			if (next === selectedValue) return;
			setSelectedValue(next);
			startTransition((): void => onValueChange(next));
		},
	};
};
