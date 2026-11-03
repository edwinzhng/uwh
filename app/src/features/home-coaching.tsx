import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import {
	Button,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate, formatTime } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { venueName } from "../domain/venue";
import { CoachingSessionActions } from "./coaching-session-actions";

export const HomeCoaching = ({ event }: { event: ClubEvent }): ReactElement => {
	const router = useRouter();
	return (
		<Stack gap="sm">
			<SectionHeading icon="calendar" size="small">
				Next practice
			</SectionHeading>
			<Surface>
				<Stack>
					<Text variant="h4">{event.title}</Text>
					<Text variant="small" tone="secondary">
						{formatDate(event.date)} · {formatTime(event.start)} ·{" "}
						{venueName(event.venue)}
					</Text>
					<CoachingSessionActions eventId={event.id} />
					<Row>
						<Button
							label="Prepare practice"
							prefix="arrowRight"
							onPress={(): void =>
								router.push({
									pathname: "/session",
									params: { event: event.id, tab: "coaching" },
								})
							}
						/>
					</Row>
				</Stack>
			</Surface>
		</Stack>
	);
};
