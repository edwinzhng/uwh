import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	EmptyState,
	List,
	ListItem,
	SectionHeading,
	Stack,
	Surface,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import { AccountCommitments } from "./session-series-link";

export const AccountParticipation = (): ReactElement => {
	const { data } = useApp();
	const person = useActivePerson();
	const router = useRouter();
	const today = clubDate(undefined, data.timeZone);
	const tournaments = data.events.filter(
		(event) =>
			event.kind === "tournament" &&
			!event.cancelled &&
			(event.endDate ?? event.date) >= today &&
			data.responses.some(
				(response) =>
					response.eventId === event.id &&
					response.personId === person.id &&
					["going", "waiting"].includes(response.response),
			),
	);
	return (
		<Stack gap="xl">
			<Stack gap="sm">
				<SectionHeading size="small">My commitments</SectionHeading>
				<AccountCommitments personId={person.id} />
			</Stack>
			<Stack gap="sm">
				<SectionHeading size="small">My tournaments</SectionHeading>
				{tournaments.length ? (
					<Surface padding="xs">
						<List>
							{tournaments.map((event) => (
								<ListItem
									key={event.id}
									title={event.title}
									description={`${formatDate(event.date)} · ${event.venue}`}
									onPress={(): void =>
										router.push({
											pathname: "/session",
											params: { event: event.id },
										})
									}
								/>
							))}
						</List>
					</Surface>
				) : (
					<EmptyState
						title="No tournament responses yet"
						description="Respond to a tournament in Schedule to keep it here."
					/>
				)}
			</Stack>
		</Stack>
	);
};
