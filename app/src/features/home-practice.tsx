import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import {
	Avatar,
	Badge,
	EventResponseRow,
	EventSummary,
	Row,
	Stack,
	SummaryCard,
	Surface,
	Text,
} from "../design-system";
import { canRegister, eventResponse, formatDate } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import {
	eventDateParts,
	eventTimeRange,
} from "../domain/event-card-presentation";
import { scheduleCardTone } from "../domain/event-response-presentation";
import { signupState } from "../domain/event-time";
import { householdMembers } from "../domain/home";
import { venueName } from "../domain/venue";
import { HomePracticeLineup } from "./home-practice-lineup";
import { ResponseControl } from "./response-control";
import { useEventNow } from "./use-event-now";

export const HomePractice = ({
	event,
	responseNeeded = false,
}: {
	event?: ClubEvent;
	responseNeeded?: boolean;
}): ReactElement => {
	const { data, account } = useApp();
	const activePerson = useActivePerson();
	const now = useEventNow(event);
	if (!event)
		return (
			<SummaryCard title="Next practice" icon="calendar" compact>
				<Text tone="secondary">No upcoming practices.</Text>
			</SummaryCard>
		);
	const signup = signupState(event, now);
	const open = signup === "open" && !event.cancelled;
	const people = householdMembers(data, account).filter((person) =>
		canRegister(person, event),
	);
	const showIdentity = people.length > 1;
	const date = eventDateParts(event.date);
	const time = eventTimeRange(event.start, event.end);
	const tone = scheduleCardTone({
		response: eventResponse(data, event.id, activePerson.id).response,
		signup,
		muted: event.cancelled,
	});
	return (
		<Surface
			density="compact"
			variant={tone === "neutral" ? "subtle" : "default"}
			borderTone={tone}
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
				compact={false}
				status={
					event.cancelled ? (
						<Badge label="Cancelled" kind="warning" />
					) : responseNeeded && open ? (
						<Badge label="Response needed" kind="neutral" />
					) : undefined
				}
			>
				<Stack gap="xs">
					{people.map((person) => (
						<Stack key={person.id} gap="xxs">
							{showIdentity ? (
								<Row gap="xs">
									<Avatar name={person.name} personId={person.id} compact />
									<Text variant="small" weight="medium">
										{person.name}
									</Text>
								</Row>
							) : undefined}
							{event.parts?.length && open ? (
								<ResponseControl
									event={event}
									personId={person.id}
									hideLabel
									quick
									compactRows
									firstDivider={false}
								/>
							) : open ? (
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
									<ResponseControl
										event={event}
										personId={person.id}
										hideLabel
										quick
									/>
								</Row>
							)}
							<HomePracticeLineup event={event} personId={person.id} />
						</Stack>
					))}
				</Stack>
			</EventSummary>
		</Surface>
	);
};
