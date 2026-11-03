import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Avatar,
	Badge,
	EventSummary,
	Row,
	type ScheduleDateLayout,
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
import { eventResponsePresentation } from "../domain/event-response-presentation";
import { signupState } from "../domain/event-time";
import { householdAttendanceReason } from "../domain/home";
import { venueName } from "../domain/venue";
import { EventAttendeesPreview } from "./event-attendees-preview";
import { EventPreviewActions } from "./event-preview-actions";
import { ResponseControl } from "./response-control";
import { SessionReflectionAction } from "./session-reflection-action";
import { SignupWindow } from "./signup-window";
import { useEventNow } from "./use-event-now";

export const HouseholdEventCard = ({
	event,
	attendanceCount,
	past = false,
	dateLayout = "badge",
	compactPast = true,
}: {
	event: ClubEvent;
	attendanceCount?: number;
	past?: boolean;
	dateLayout?: ScheduleDateLayout;
	compactPast?: boolean;
}): ReactElement => {
	const { data } = useApp();
	const person = useActivePerson();
	const date = eventDateParts(event.date);
	const reason = householdAttendanceReason(person, event);
	const current = eventResponse(data, event.id, person.id);
	const response = current.response;
	const signup = signupState(event, useEventNow(event));
	const open = signup === "open" && !event.cancelled;
	const status = eventResponsePresentation(current, event.parts?.length);
	const tone =
		reason || event.cancelled || past || response === "unanswered"
			? "neutral"
			: status.tone;
	if (past && compactPast)
		return (
			<Surface density="compact">
				<Row gap="sm">
					<Stack grow>
						<EventSummary
							title={event.title}
							weekday={date.weekday}
							day={date.day}
							month={date.month}
							dateLabel={formatDate(event.date)}
							time={eventTimeRange(event.start, event.end)}
							venue={venueName(event.venue)}
							href={{ pathname: "/session", params: { event: event.id } }}
							dateLayout={dateLayout}
							compact
						/>
					</Stack>
					<SessionReflectionAction event={event} />
				</Row>
			</Surface>
		);
	return (
		<Surface
			density="compact"
			borderTone={tone}
			borderStyle={
				response === "unanswered" && !past && !event.cancelled
					? "dashed"
					: "solid"
			}
		>
			<Stack gap="xs">
				<EventSummary
					status={
						event.cancelled ? (
							<Badge label="Cancelled" kind="warning" />
						) : !past && !reason && open ? (
							<Badge
								label={status.label}
								kind={response === "unanswered" ? "neutral" : status.tone}
							/>
						) : undefined
					}
					actions={
						open && response !== "unavailable" && !event.cancelled ? (
							<Row gap="xs">
								<EventAttendeesPreview
									event={event}
									attendanceCount={attendanceCount}
								/>

								{!past && !reason && !event.cancelled ? (
									<EventPreviewActions event={event} />
								) : undefined}
							</Row>
						) : undefined
					}
					dateLayout={dateLayout}
					title={event.title}
					weekday={date.weekday}
					day={date.day}
					month={date.month}
					dateLabel={formatDate(event.date)}
					time={eventTimeRange(event.start, event.end)}
					venue={venueName(event.venue)}
					href={{ pathname: "/session", params: { event: event.id } }}
				/>
				<Row justify="between" gap="xs" wrap>
					<Row gap="xs">
						<Avatar name={person.name} personId={person.id} compact />
						<Text variant="small" weight="medium">
							{person.name}
						</Text>
					</Row>
					{!past &&
					!reason &&
					!event.cancelled &&
					(!event.parts?.length || !open) ? (
						<ResponseControl
							event={event}
							personId={person.id}
							hideLabel
							quick
						/>
					) : undefined}
				</Row>
				{event.cancelled || past ? undefined : reason ? (
					<Text variant="caption" tone="secondary">
						{reason}
					</Text>
				) : (
					<>
						{open ? <SignupWindow event={event} /> : undefined}
						{event.parts?.length && open ? (
							<ResponseControl
								event={event}
								personId={person.id}
								hideLabel
								quick
							/>
						) : undefined}
					</>
				)}
				{past ? <SessionReflectionAction event={event} /> : undefined}
			</Stack>
		</Surface>
	);
};
