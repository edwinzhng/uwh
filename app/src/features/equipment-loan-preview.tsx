import type { ReactElement } from "react";
import { usePreviewEquipmentLoans } from "../backend/use-equipment-loans";
import { EquipmentLoanForm } from "./equipment-loan-form";
import type { EquipmentLoanProviderProps } from "./equipment-loan-live";

export const EquipmentLoanPreview = ({
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
		service={usePreviewEquipmentLoans(eventId)}
	/>
);
