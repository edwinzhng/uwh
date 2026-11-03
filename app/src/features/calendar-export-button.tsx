import { type ReactElement, useState } from "react";
import { useActivePerson } from "../demo/app-state";
import { Button, Dialog } from "../design-system";
import {
	type CalendarView,
	calendarViewAfterScopeChange,
	calendarViewTitle,
} from "../domain/calendar-workflow";
import { CalendarSettings } from "./calendar-settings";
import { useReviewFlow } from "./use-review-flow";

export const CalendarExportButton = (): ReactElement => {
	const [open, setOpen] = useState(useReviewFlow() === "sync-calendar");
	const active = useActivePerson();
	const [selected, setSelected] = useState([active.id]);
	const [view, setView] = useState<CalendarView>("choose");
	const [returnTo, setReturnTo] = useState<CalendarView>("choose");
	const [busy, setBusy] = useState(false);
	return (
		<>
			<Button
				label="Export"
				variant="ghost"
				prefix="calendar"
				onPress={(): void => {
					setSelected([active.id]);
					setView("choose");
					setOpen(true);
				}}
			/>
			<Dialog
				title={calendarViewTitle(view)}
				focusKey={view}
				isOpen={open}
				isDismissDisabled={busy}
				intent="picker"
				onOpenChange={(next): void => {
					if (!busy) setOpen(next);
				}}
				footer={false}
			>
				<CalendarSettings
					view={view}
					selected={selected}
					busy={busy}
					onBusyChange={setBusy}
					onViewChange={(next): void => {
						if (next === "people") setReturnTo(view);
						setView(next);
					}}
					onPeopleSave={(ids): void => {
						setSelected(ids);
						setView(calendarViewAfterScopeChange(returnTo));
					}}
					onBack={(): void => setView(view === "people" ? returnTo : "choose")}
				/>
			</Dialog>
		</>
	);
};
