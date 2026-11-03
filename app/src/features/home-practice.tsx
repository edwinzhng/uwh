import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Row, Stack, SummaryCard, Text } from "../design-system";
import {
	canRegister,
	eventResponse,
	formatDate,
	formatTime,
} from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { householdMembers } from "../domain/home";
import { venueName } from "../domain/venue";

export const HomePractice = ({
	event,
}: {
	event?: ClubEvent;
}): ReactElement => {
	const router = useRouter();
	const { data, account } = useApp();
	const people = householdMembers(data, account).filter(
		(person) => event && canRegister(person, event),
	);
	return (
		<SummaryCard
			title="Next practice"
			tone={event ? "brand" : "default"}
			category="sky"
			onPress={
				event
					? (): void =>
							router.push({ pathname: "/session", params: { event: event.id } })
					: undefined
			}
			accessibilityLabel={
				event
					? `Next practice. ${event.title}. ${formatDate(event.date)}. ${formatTime(event.start)} to ${formatTime(event.end)}. ${venueName(event.venue)}. Open practice`
					: undefined
			}
		>
			{event ? (
				<Stack gap="xs">
					<Text variant="h1" tone="onBrand">
						{event.title}
					</Text>
					<Text tone="onBrand">{formatDate(event.date)}</Text>
					<Badge
						label={`${formatTime(event.start)}–${formatTime(event.end)}`}
					/>
					<Text variant="caption" tone="onBrand">
						{venueName(event.venue)}
					</Text>
					{people.map((person) => {
						const response = eventResponse(data, event.id, person.id).response;
						return (
							<Row key={person.id} justify="between" wrap>
								<Text variant="caption" weight="semibold" tone="onBrand">
									{person.id === account.personId ? "You" : person.name}
								</Text>
								<Badge
									label={
										response === "going"
											? "✓ Going"
											: response === "unavailable"
												? "Not going"
												: response === "waiting"
													? "Waitlisted"
													: "Not answered"
									}
								/>
							</Row>
						);
					})}
				</Stack>
			) : (
				<Text tone="secondary">No upcoming practices.</Text>
			)}
		</SummaryCard>
	);
};
