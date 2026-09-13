import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Badge,
	EmptyState,
	List,
	ListItem,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";

export const TournamentSummary = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data } = useApp();
	const person = useActivePerson();
	const assignment = event.tournamentRoster?.find(
		(entry) => entry.personId === person.id,
	);
	return (
		<Surface header={<Text variant="h4">Tournament roster</Text>}>
			<Stack>
				{event.responseDeadline ? (
					<Text variant="small">
						Respond by {formatDate(event.responseDeadline)}
					</Text>
				) : undefined}
				<Badge
					label={
						assignment
							? `${person.name} · ${assignment.team}`
							: `${person.name} · Not assigned to a team`
					}
					kind={assignment ? "success" : "neutral"}
				/>
				<Text variant="small" tone="secondary">
					Marking yourself available does not confirm a roster place. The
					organizer assigns teams separately.
				</Text>
				{event.tournamentRoster?.length ? (
					<List>
						{event.tournamentRoster.map((entry) => (
							<ListItem
								key={entry.personId}
								title={
									data.members.find((member) => member.id === entry.personId)
										?.name ?? "Club player"
								}
								description={entry.team}
							/>
						))}
					</List>
				) : (
					<EmptyState
						title="No teams assigned yet"
						description="The confirmed roster will appear here when the organizer assigns players to teams."
					/>
				)}
			</Stack>
		</Surface>
	);
};
