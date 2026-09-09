import { type ReactElement, useState } from "react";
import { Button, Dialog } from "../design-system";
import { CalendarSettings } from "./calendar-settings";

export const CalendarExportButton = (): ReactElement => {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label="Export calendar"
				prefix="calendar"
				variant="secondary"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				title="Export calendar"
				isOpen={open}
				onOpenChange={setOpen}
				footer={false}
			>
				{open ? <CalendarSettings /> : undefined}
			</Dialog>
		</>
	);
};
