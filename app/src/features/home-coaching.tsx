import type { ReactElement } from "react";
import {
	formatTimeLocation,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { eventTimeRange } from "../domain/event-card-presentation";
import { venueName } from "../domain/venue";
import { CoachingSessionActions } from "./coaching-session-actions";

export const HomeCoaching = ({ event }: { event: ClubEvent }): ReactElement => {
	return (
		<Stack gap="sm">
			<SectionHeading icon="calendar">Next practice</SectionHeading>
			<Surface>
				<Stack>
					<Text variant="h4">{event.title}</Text>
					<Text variant="small" tone="secondary">
						{formatDate(event.date)} ·{" "}
						{formatTimeLocation(
							eventTimeRange(event.start, event.end),
							venueName(event.venue),
						)}
					</Text>
					<CoachingSessionActions eventId={event.id} />
				</Stack>
			</Surface>
		</Stack>
	);
};
