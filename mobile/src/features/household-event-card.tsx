import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Button, Row, Stack, Surface, Text } from "../design-system";
import { canRegister, formatDate, formatTime } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { householdMembers, relevantHouseholdEvent } from "../domain/home";
import { ResponseControl } from "./response-control";

export const HouseholdEventCard = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const people = householdMembers(data, account).filter(
		(person) =>
			canRegister(person, event) && relevantHouseholdEvent(event, [person]),
	);
	return (
		<Surface>
			<Stack>
				<Row justify="between" wrap>
					<Text variant="h4">{event.title}</Text>
					{event.cancelled ? (
						<Badge label="Cancelled" kind="warning" />
					) : event.kind === "tournament" ? (
						<Badge label="Tournament" />
					) : undefined}
				</Row>
				<Text variant="small" tone="secondary">
					{formatDate(event.date)}
					{event.endDate && event.endDate !== event.date
						? ` – ${formatDate(event.endDate)}`
						: ""}{" "}
					· {formatTime(event.start)}–{formatTime(event.end)}
				</Text>
				<Text variant="small">{event.venue}</Text>
				{event.responseDeadline ? (
					<Text variant="small">
						Respond by {formatDate(event.responseDeadline)}
					</Text>
				) : undefined}
				{people.map((person) => (
					<Row key={person.id} justify="between" wrap>
						<Text variant="label">
							{person.id === account.personId ? "You" : person.name}
						</Text>
						<ResponseControl event={event} personId={person.id} />
					</Row>
				))}
				<Row justify="end">
					<Button
						label={
							event.kind === "tournament" ? "View tournament" : "View session"
						}
						variant="ghost"
						onPress={(): void =>
							router.push({ pathname: "/session", params: { event: event.id } })
						}
					/>
				</Row>
			</Stack>
		</Surface>
	);
};
