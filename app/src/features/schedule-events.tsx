import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { List } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { HouseholdEventCard } from "./household-event-card";

export const ScheduleEvents = ({
	events,
	past = false,
}: {
	events: ClubEvent[];
	past?: boolean;
}): ReactElement => {
	const { data } = useApp();
	return (
		<List gap="sm">
			{events.map((event) => (
				<HouseholdEventCard
					key={event.id}
					event={event}
					past={past}
					attendanceCount={
						data.responses.filter(
							(entry) =>
								entry.eventId === event.id && entry.response === "going",
						).length
					}
				/>
			))}
		</List>
	);
};
