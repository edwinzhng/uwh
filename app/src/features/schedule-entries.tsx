import type { ReactElement } from "react";
import type { ScheduleEntry } from "../../convex/pages";
import { AppContext, useApp } from "../demo/app-state";
import { ScheduleEvents } from "./schedule-events";

export const AgendaEntries = ({
	entries,
	past = false,
}: {
	entries: ScheduleEntry[];
	past?: boolean;
}): ReactElement => {
	const app = useApp();
	return (
		<AppContext.Provider
			value={{
				...app,
				data: {
					...app.data,
					events: entries.map((entry) => entry.event),
					responses: entries.flatMap((entry) => entry.responses),
				},
			}}
		>
			<ScheduleEvents
				events={entries.map((entry) => entry.event)}
				past={past}
			/>
		</AppContext.Provider>
	);
};
