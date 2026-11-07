import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { ContentReveal, List, motion } from "../design-system";
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
		<List gap="xs">
			{events.map((event, index) => (
				<ContentReveal
					key={event.id}
					delay={(Math.min(index, 5) * motion.duration.fast) / 3}
				>
					<HouseholdEventCard
						event={event}
						past={past}
						attendanceCount={
							data.responses.filter(
								(entry) =>
									entry.eventId === event.id && entry.response === "going",
							).length
						}
					/>
				</ContentReveal>
			))}
		</List>
	);
};
