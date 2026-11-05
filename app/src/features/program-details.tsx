import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import type { ScheduleEntry } from "../../convex/pages";
import { useApp } from "../demo/app-state";
import {
	EmptyState,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { ClubProgram } from "../domain/programs";
import { agendaEvents } from "../domain/schedule-agenda";
import { DataPage } from "./data-page";
import { AgendaEntries } from "./schedule-entries";
import { useEventNow } from "./use-event-now";

export const ProgramDetails = ({
	program,
}: {
	program: ClubProgram;
}): ReactElement => {
	const { data } = useApp();
	const now = useEventNow(undefined);
	const members = data.members
		.filter(
			(member) =>
				!member.archived &&
				!member.mergedInto &&
				member.programs.includes(program.id),
		)
		.sort((a, b) => a.name.localeCompare(b.name));
	const preview: ScheduleEntry[] = agendaEvents(
		data.events,
		now,
		program.id,
	).upcoming.map((event) => ({
		event,
		responses: data.responses.filter(
			(response) => response.eventId === event.id,
		),
	}));
	return (
		<Stack gap="section">
			{program.description ? (
				<Surface>
					<Text variant="small">{program.description}</Text>
				</Surface>
			) : undefined}
			<Stack gap="heading">
				<SectionHeading>Upcoming events</SectionHeading>
				<DataPage
					config={{
						query: api.schedule_agenda.upcoming,
						args: { programId: program.id, now },
						preview,
						size: 10,
					}}
				>
					{(entries): ReactElement =>
						entries.length ? (
							<AgendaEntries entries={entries} />
						) : (
							<EmptyState title="No upcoming events" />
						)
					}
				</DataPage>
			</Stack>
			<Stack gap="heading">
				<SectionHeading>Members ({members.length})</SectionHeading>
				<Surface>
					{members.length ? (
						<List>
							{members.map((member) => (
								<ListItem
									key={member.id}
									title={member.name}
									avatar={member.name}
									avatarId={member.id}
									showChevron={false}
								/>
							))}
						</List>
					) : (
						<EmptyState title="No members" />
					)}
				</Surface>
			</Stack>
		</Stack>
	);
};
