import type { ReactElement } from "react";
import { PopupRow } from "./popup-row";

export const PersonChoice = ({
	name,
	personId,
	checked,
	onChange,
	isDisabled,
}: {
	name: string;
	personId?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	isDisabled?: boolean;
}): ReactElement => (
	<PopupRow
		label={name}
		person={{ id: personId }}
		isChecked={checked}
		isDisabled={isDisabled}
		onSelect={(): void => onChange(!checked)}
	/>
);
