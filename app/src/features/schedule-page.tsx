import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { ScheduleEntry } from "../../convex/pages";
import { useApp } from "../demo/app-state";
import {
	EmptyState,
	LoadingContent,
	SectionHeading,
	Stack,
} from "../design-system";
import { agendaEvents, eventFinished } from "../domain/schedule-agenda";
import { DataPage } from "./data-page";
import { AgendaEntries } from "./schedule-entries";
import { SchedulePast } from "./schedule-past";

export const SchedulePage = ({
	programId,
	now,
}: {
	programId?: string;
	now: number;
}): ReactElement => {
	const app = useApp();
	const [windowStart] = useState(now);
	const preview = agendaEvents(app.data.events, now, programId);
	const entry = (event: ScheduleEntry["event"]): ScheduleEntry => ({
		event,
		responses: app.data.responses.filter((row) => row.eventId === event.id),
	});
	return (
		<Stack gap="md">
			<SchedulePast
				key={programId ?? "all"}
				programId={programId}
				now={windowStart}
			/>
			<Stack gap="xs">
				<SectionHeading>Upcoming</SectionHeading>
				<DataPage
					config={{
						query: api.schedule_agenda.upcoming,
						args: { programId, now: windowStart },
						preview: preview.upcoming.map(entry),
						size: 20,
					}}
				>
					{(items, { complete }) => {
						const upcoming = items.filter(
							(entry) => !eventFinished(entry.event, now),
						);
						return upcoming.length ? (
							<AgendaEntries entries={upcoming} />
						) : complete ? (
							<EmptyState
								title="No upcoming events"
								description={
									programId
										? "There are no upcoming events for this program."
										: "New events will appear here."
								}
							/>
						) : (
							<LoadingContent />
						);
					}}
				</DataPage>
			</Stack>
		</Stack>
	);
};
