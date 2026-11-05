import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useMessaging } from "../backend/messaging-context";
import { useActivePerson } from "../demo/app-state";
import {
	Avatar,
	NavigationCard,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { eventTimeRange } from "../domain/event-card-presentation";
import { programRoomId } from "../domain/managed-rooms";
import { ResponseControl } from "./response-control";
import { SharedSessionPlan } from "./shared-session-plan";
import { TeamPanel } from "./team-panel";

export const PracticeOverview = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const router = useRouter();
	const person = useActivePerson();
	const messaging = useMessaging();
	const room = messaging.threads.find(
		(thread) => thread.id === programRoomId(event.program),
	);
	const blocks = event.parts?.length
		? event.parts
		: [
				{
					id: undefined,
					title: "Attendance",
					start: event.start,
					end: event.end,
				},
			];
	return (
		<Stack gap="section">
			<Stack gap="heading">
				<SectionHeading>My status</SectionHeading>
				{blocks.map((part) => (
					<Surface key={part.id ?? event.id} padding="sm">
						<Stack gap="xs">
							<Row gap="xs" wrap>
								<Text variant="small" weight="medium">
									{part.title}
								</Text>
								<Text variant="caption" tone="secondary">
									· {eventTimeRange(part.start, part.end)}
								</Text>
							</Row>
							<Row justify="between" gap="xs" wrap>
								<Row gap="xs">
									<Avatar name={person.name} personId={person.id} compact />
									<Text variant="small" weight="medium">
										{person.name}
									</Text>
								</Row>
								<ResponseControl
									event={event}
									personId={person.id}
									partId={part.id}
									quick
									hideLabel
								/>
							</Row>
						</Stack>
					</Surface>
				))}
			</Stack>
			{room ? (
				<NavigationCard
					title="Program chat"
					description={room.title}
					label="Open program chat"
					icon="message"
					onPress={(): void =>
						router.push({ pathname: "/conversation", params: { id: room.id } })
					}
				/>
			) : undefined}

			<TeamPanel event={event} readOnly inline />
			<SharedSessionPlan event={event} />
		</Stack>
	);
};
