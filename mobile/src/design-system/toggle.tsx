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
}: SwitchProps): ReactElement => (
	<ContentRow
		title={label}
		description={description}
		control={
			<SwitchControl
				label={label}
				description={description}
				value={value}
				onValueChange={onValueChange}
				isDisabled={isDisabled}
			/>
		}
	/>
);
