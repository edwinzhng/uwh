import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Avatar,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canCoach } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { eventTimeRange } from "../domain/event-card-presentation";
import { ResponseControl } from "./response-control";
import { SharedSessionPlan } from "./shared-session-plan";
import { TeamPanel } from "./team-panel";

export const PracticeOverview = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const person = useActivePerson();
	const { account } = useApp();
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
			<TeamPanel
				event={event}
				readOnly
				inline
				playerPersonId={canCoach(account) ? undefined : person.id}
			/>
			<SharedSessionPlan event={event} />
		</Stack>
	);
};
