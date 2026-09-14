import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState, List, ListItem, Stack, Text } from "../design-system";
import { canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";

export const TournamentPeople = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data } = useApp();
	const members = data.members.filter((member) => canRegister(member, event));
	return (
		<Stack>
			<Text variant="small" tone="secondary">
				Interest and confirmed team assignments are tracked separately.
			</Text>
			<List>
				{members.map((member) => {
					const response = eventResponse(data, event.id, member.id).response;
					const availability =
						response === "going"
							? "Interested"
							: response === "unavailable"
								? "Not interested"
								: "Not responded";
					const assignment = event.tournamentRoster?.find(
						(entry) => entry.personId === member.id,
					);
					return (
						<ListItem
							key={member.id}
							title={member.name}
							description={`${availability} · ${assignment ? assignment.team : "Not assigned"}`}
						/>
					);
				})}
				{!members.length ? (
					<EmptyState
						title="No eligible players"
						description="Players eligible for this tournament will appear here with their availability and team assignments."
					/>
				) : undefined}
			</List>
		</Stack>
	);
};
