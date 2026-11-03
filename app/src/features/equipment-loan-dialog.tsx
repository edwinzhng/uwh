import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import type { ClubEvent, Equipment } from "../domain/app-types";
import { EquipmentLoanLive } from "./equipment-loan-live";
import { EquipmentLoanPreview } from "./equipment-loan-preview";

export type EquipmentLoanDialogProps = {
	item?: Equipment;
	practice?: ClubEvent;
	onClose: () => void;
};
export const EquipmentLoanDialog = ({
	item,
	practice,
	onClose,
}: EquipmentLoanDialogProps): ReactElement => {
	const { source, account } = useApp();
	const [eventId, setEventId] = useState(practice?.id);
	return source === "convex" ? (
		<EquipmentLoanLive
			key={account.id}
			item={item}
			practice={practice}
			eventId={eventId}
			onEventChange={setEventId}
			onClose={onClose}
		/>
	) : (
		<EquipmentLoanPreview
			key={account.id}
			item={item}
			practice={practice}
			eventId={eventId}
			onEventChange={setEventId}
			onClose={onClose}
		/>
	);
};
