import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatDate, formatTime } from "../domain/app-rules";
import { clubTimestamp } from "../domain/event-time";

export const HomeCoaching = ({
	now,
}: {
	now: number;
}): ReactElement | undefined => {
	const { data, account } = useApp();
	const router = useRouter();
	const event = data.events
		.filter(
			(event) =>
				!event.cancelled &&
				clubTimestamp(
					event.endDate ?? event.date,
					event.end,
					event.timeZone ?? data.timeZone,
				) > now &&
				(event.kind === "training" || event.kind === "hockey"),
		)
		.toSorted((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
		.at(0);
	if (!account.coachPrograms.length || !event) return undefined;
	return (
		<Stack gap="sm">
			<SectionHeading size="small">Next coaching session</SectionHeading>
			<Surface>
				<Stack>
					<Text variant="h4">{event.title}</Text>
					<Text variant="small" tone="secondary">
						{formatDate(event.date)} · {formatTime(event.start)} · {event.venue}
					</Text>
					<Row wrap>
						<Button
							label="Attendance"
							variant="secondary"
							onPress={(): void =>
								router.push({
									pathname: "/session",
									params: { event: event.id, tab: "people" },
								})
							}
						/>
						<Button
							label="Session plan"
							variant="ghost"
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
