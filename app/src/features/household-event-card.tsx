import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Avatar,
	Badge,
	EventResponseRow,
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
import {
	eventResponsePresentation,
	scheduleCardTone,
} from "../domain/event-response-presentation";
import { signupState } from "../domain/event-time";
import { householdAttendanceReason, householdMembers } from "../domain/home";
import { pastAttendancePresentation } from "../domain/past-attendance-presentation";
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
	dateLayout = "rail",
}: {
	event: ClubEvent;
	attendanceCount?: number;
	past?: boolean;
	dateLayout?: ScheduleDateLayout;
}): ReactElement => {
	const { data, account } = useApp();
	const person = useActivePerson();
	const date = eventDateParts(event.date);
	const time = eventTimeRange(event.start, event.end);
	const reason = householdAttendanceReason(person, event);
	const current = eventResponse(data, event.id, person.id);
	const signup = signupState(event, useEventNow(event));
	const open = signup === "open" && !event.cancelled;
	const status = eventResponsePresentation(current, event.parts?.length);
	const pastStatus = pastAttendancePresentation(event, current);
	const showIdentity =
		householdMembers(data, account).filter((member) =>
			canRegister(member, event),
		).length > 1;
	const tone =
		past && !reason && !event.cancelled
			? pastStatus.tone
			: scheduleCardTone({
					response: current.response,
					signup,
					muted: Boolean(reason || event.cancelled || past),
				});
	const showResponse =
		!past && !reason && !event.cancelled && signup !== "scheduled";
	return (
		<Surface
			density="compact"
			variant={past || tone === "neutral" ? "subtle" : "default"}
			borderTone={past ? "neutral" : tone}
		>
			<EventSummary
				title={event.title}
				weekday={date.weekday}
				day={date.day}
				month={date.month}
				dateLabel={formatDate(event.date)}
				time={time}
				venue={venueName(event.venue)}
				href={{ pathname: "/session", params: { event: event.id } }}
				dateLayout={dateLayout}
				compact={false}
				status={
					event.cancelled ? (
						<Badge label="Cancelled" kind="warning" />
					) : !past && !reason && open && current.response === "waiting" ? (
						<Badge label={status.label} kind={status.tone} />
					) : undefined
				}
				actions={
					past ? (
						<Row gap="xs">
							<EventPreviewActions event={event} />
							<SessionReflectionAction event={event} />
						</Row>
					) : !event.cancelled && signup !== "scheduled" ? (
						<EventPreviewActions event={event} />
					) : undefined
				}
				footer={
					!event.cancelled ? (
						<EventAttendeesPreview
							event={event}
							attendanceCount={attendanceCount}
						/>
					) : undefined
				}
			>
				<Stack gap="none">
					{showIdentity && !past && signup !== "scheduled" ? (
						<Row gap="xs">
							<Avatar name={person.name} personId={person.id} compact />
							<Text variant="small" weight="medium">
								{person.name}
							</Text>
						</Row>
					) : undefined}
					{showResponse && event.parts?.length && open ? (
						<ResponseControl
							event={event}
							personId={person.id}
							hideLabel
							quick
							compactRows
							firstDivider={false}
						/>
					) : showResponse && open ? (
						<EventResponseRow label={time} compact divider={false}>
							<ResponseControl
								event={event}
								personId={person.id}
								hideLabel
								quick
							/>
						</EventResponseRow>
					) : (
						<Row justify="between" gap="xs" wrap>
							<Text variant="small" tone="secondary">
								{time}
							</Text>
							{past && !event.cancelled ? (
								<Row gap="xs" wrap>
									{(reason ? [reason] : pastStatus.labels).map((label) => (
										<Badge
											key={label}
											label={label}
											kind={reason ? "neutral" : pastStatus.tone}
										/>
									))}
								</Row>
							) : showResponse ? (
								<ResponseControl
									event={event}
									personId={person.id}
									hideLabel
									quick
								/>
							) : reason && !past && !event.cancelled ? (
								<Text variant="caption" tone="secondary">
									{reason}
								</Text>
							) : signup === "scheduled" && !past && !event.cancelled ? (
								<Text variant="caption" tone="secondary">
									Not open yet
								</Text>
							) : undefined}
						</Row>
					)}
				</Stack>
			</EventSummary>
		</Surface>
	);
};
