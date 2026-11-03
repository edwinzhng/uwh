import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Badge,
	EventResponseRow,
	EventSummary,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { eventResponse, formatDate } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import {
	eventDateParts,
	eventTimeRange,
} from "../domain/event-card-presentation";
import { householdAttendanceReason } from "../domain/home";
import { venueName } from "../domain/venue";
import { EventPreviewActions } from "./event-preview-actions";
import { ResponseControl } from "./response-control";

export const HouseholdEventCard = ({
	event,
	attendanceCount,
	past = false,
}: {
	event: ClubEvent;
	attendanceCount?: number;
	past?: boolean;
}): ReactElement => {
	const { data, account } = useApp();
	const person = useActivePerson();
	const date = eventDateParts(event.date);
	const reason = householdAttendanceReason(person, event);
	const response = eventResponse(data, event.id, person.id).response;
	const tone =
		reason || event.cancelled || past
			? "neutral"
			: response === "going"
				? "success"
				: response === "unavailable"
					? "danger"
					: response === "waiting"
						? "warning"
						: "neutral";
	return (
		<Surface
			density="compact"
			borderTone={event.parts?.length ? "neutral" : tone}
		>
			<Stack gap="xs">
				<EventSummary
					title={event.title}
					weekday={date.weekday}
					day={date.day}
					month={date.month}
					dateLabel={formatDate(event.date)}
					time={eventTimeRange(event.start, event.end)}
					venue={venueName(event.venue)}
					href={{ pathname: "/session", params: { event: event.id } }}
				/>
				{event.cancelled ? (
					<Badge label="Cancelled" kind="warning" />
				) : past ? undefined : reason ? (
					<Text variant="caption" tone="secondary">
						{reason}
					</Text>
				) : (
					<>
						{person.id !== account.personId ? (
							<Text variant="caption" tone="secondary">
								Response for {person.name}
							</Text>
						) : undefined}
						{event.parts?.length ? (
							<ResponseControl
								event={event}
								personId={person.id}
								hideLabel
								quick
							/>
						) : (
							<EventResponseRow
								label={
									response === "going"
										? "Attending"
										: response === "unavailable"
											? "Not attending"
											: response === "waiting"
												? "Waitlisted"
												: "Your response"
								}
								tone={tone}
							>
								<ResponseControl
									event={event}
									personId={person.id}
									hideLabel
									quick
								/>
							</EventResponseRow>
						)}
					</>
				)}
				<Row justify="between" wrap>
					<Text variant="caption" tone="secondary">
						{attendanceCount ?? 0} attending
					</Text>
					{past ? (
						<Text variant="caption" tone="secondary">
							Ended
						</Text>
					) : (
						<EventPreviewActions event={event} />
					)}
				</Row>
			</Stack>
		</Surface>
	);
};
