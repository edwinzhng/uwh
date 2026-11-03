import type { ReactElement } from "react";
import { ButtonControl } from "./button-control";
export const FilterChip = ({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}): ReactElement => (
	<ButtonControl
		label={label}
		variant="selection"
		density="filter"
		round
		isSelected={selected}
		onPress={onPress}
	/>
);
