import { useQuery } from "convex/react";
import { type ReactElement, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { ScheduleEntry } from "../../convex/pages";
import { AppContext, useApp } from "../demo/app-state";
import {
	EmptyState,
	LoadingContent,
	SectionHeading,
	Stack,
} from "../design-system";
import { agendaEvents, eventFinished } from "../domain/schedule-agenda";
import { DataPage } from "./data-page";
import { ScheduleEvents } from "./schedule-events";

const AgendaEntries = ({
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
const RecentEvent = ({
	entries,
}: {
	entries?: ScheduleEntry[];
}): ReactElement | undefined => {
	if (!entries) return <LoadingContent />;
	if (!entries.length) return undefined;
	return (
		<Stack gap="xs">
			<SectionHeading>Past</SectionHeading>
			<AgendaEntries entries={entries} past />
		</Stack>
	);
};
const LiveRecent = ({
	programId,
	now,
}: {
	programId?: string;
	now: number;
}): ReactElement => {
	const entries = useQuery(api.schedule_agenda.recent, { programId, now });
	const previous = useRef<ScheduleEntry[]>(undefined);
	if (entries !== undefined) previous.current = entries;
	return <RecentEvent entries={entries ?? previous.current} />;
};
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
			{app.source === "convex" ? (
				<LiveRecent key={programId ?? "all"} programId={programId} now={now} />
			) : (
				<RecentEvent entries={preview.past ? [entry(preview.past)] : []} />
			)}
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
