import type { ReactElement } from "react";
import { ContentRow } from "./content-row";
import { SwitchControl } from "./switch-control";
import type { SwitchProps } from "./switch-props";
export const Toggle = ({
	label,
	description,
	value,
	onValueChange,
	isDisabled,
	compact,
}: SwitchProps): ReactElement => (
	<ContentRow
		title={label}
		titleVariant={compact ? "small" : "label"}
		description={description}
		control={
			<SwitchControl
				compact={compact}
				label={label}
				description={description}
				value={value}
				onValueChange={onValueChange}
				isDisabled={isDisabled}
			/>
		}
	/>
);
