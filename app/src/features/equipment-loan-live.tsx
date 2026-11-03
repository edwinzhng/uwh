import type { ReactElement } from "react";
import { useLiveEquipmentLoans } from "../backend/use-equipment-loans";
import type { EquipmentLoanDialogProps } from "./equipment-loan-dialog";
import { EquipmentLoanForm } from "./equipment-loan-form";

export type EquipmentLoanProviderProps = EquipmentLoanDialogProps & {
	eventId?: string;
	onEventChange: (id: string | undefined) => void;
};
export const EquipmentLoanLive = ({
	item,
	practice,
	eventId,
	onEventChange,
	onClose,
}: EquipmentLoanProviderProps): ReactElement => (
	<EquipmentLoanForm
		item={item}
		practice={practice}
		eventId={eventId}
		onEventChange={onEventChange}
		onClose={onClose}
		service={useLiveEquipmentLoans(eventId)}
	/>
);
