import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog } from "../design-system";
import { canManagePerson } from "../domain/app-rules";
import { CalendarSettings } from "./calendar-settings";
import { useReviewFlow } from "./use-review-flow";

export const CalendarExportButton = (): ReactElement => {
	const [open, setOpen] = useState(useReviewFlow() === "sync-calendar");
	const { data, account } = useApp();
	const people = data.members.filter(
		(person) =>
			canManagePerson(account, person.id) &&
			!person.archived &&
			!person.mergedInto,
	);
	const [selected, setSelected] = useState(people.map((person) => person.id));
	const [busy, setBusy] = useState(false);
	return (
		<>
			<Button
				label="Sync"
				variant="ghost"
				prefix="calendar"
				onPress={(): void => {
					setSelected(people.map((person) => person.id));
					setOpen(true);
				}}
			/>
			<Dialog
				title="Add to calendar"
				isOpen={open}
				isDismissDisabled={busy}
				intent="picker"
				onOpenChange={(next): void => {
					if (!busy) setOpen(next);
				}}
				footer={false}
			>
				<CalendarSettings
					selected={selected}
					busy={busy}
					onBusyChange={setBusy}
					onPeopleChange={setSelected}
				/>
			</Dialog>
		</>
	);
};
