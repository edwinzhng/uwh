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
import { canRegister, eventResponse, formatDate } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import {
	eventDateParts,
	eventTimeRange,
} from "../domain/event-card-presentation";
import { eventResponsePresentation } from "../domain/event-response-presentation";
import { signupState } from "../domain/event-time";
import { householdAttendanceReason, householdMembers } from "../domain/home";
import { venueName } from "../domain/venue";
import { EventAttendeesPreview } from "./event-attendees-preview";
import { EventPreviewActions } from "./event-preview-actions";
import { ResponseControl } from "./response-control";
import { SessionReflectionAction } from "./session-reflection-action";
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
	const { data, account } = useApp();
	const person = useActivePerson();
	const date = eventDateParts(event.date);
	const reason = householdAttendanceReason(person, event);
	const current = eventResponse(data, event.id, person.id);
	const response = current.response;
	const signup = signupState(event, useEventNow(event));
	const open = signup === "open" && !event.cancelled;
	const status = eventResponsePresentation(current, event.parts?.length);
	const showIdentity =
		householdMembers(data, account).filter((member) =>
			canRegister(member, event),
		).length > 1;
	const inlineResponse =
		!past &&
		!reason &&
		!event.cancelled &&
		(!event.parts?.length || !open) &&
		signup !== "scheduled";
	const tone =
		reason || event.cancelled || past || (response === "unanswered" && !open)
			? "neutral"
			: status.tone;
	if (past && compactPast)
		return (
			<Surface density="compact">
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
					actions={<SessionReflectionAction event={event} />}
				/>
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
						) : !past && !reason && open && response === "waiting" ? (
							<Badge label={status.label} kind={status.tone} />
						) : undefined
					}
					actions={
						signup === "scheduled" && !past && !event.cancelled ? (
							<Text variant="caption" tone="secondary">
								Not open yet
							</Text>
						) : open && response !== "unavailable" && !event.cancelled ? (
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
				{(showIdentity && signup !== "scheduled") || inlineResponse ? (
					<Row justify={showIdentity ? "between" : "end"} gap="xs" wrap>
						{showIdentity ? (
							<Row gap="xs">
								<Avatar name={person.name} personId={person.id} compact />
								<Text variant="small" weight="medium">
									{person.name}
								</Text>
							</Row>
						) : undefined}
						{inlineResponse ? (
							<ResponseControl
								event={event}
								personId={person.id}
								hideLabel
								quick
							/>
						) : undefined}
					</Row>
				) : undefined}
				{event.cancelled || past ? undefined : reason ? (
					<Text variant="caption" tone="secondary">
						{reason}
					</Text>
				) : event.parts?.length && open ? (
					<ResponseControl event={event} personId={person.id} hideLabel quick />
				) : undefined}
				{past ? <SessionReflectionAction event={event} /> : undefined}
			</Stack>
		</Surface>
	);
};
