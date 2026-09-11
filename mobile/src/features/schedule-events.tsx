import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Dialog,
	EmptyState,
	EventActions,
	EventCard,
	List,
	ListItem,
	Stack,
	Text,
} from "../design-system";
import { formatDate, formatTime } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { ResponseControl } from "./response-control";

export const ScheduleEvents = ({
	events,
}: {
	events: ClubEvent[];
}): ReactElement => {
	const { data } = useApp();
	const router = useRouter();
	const [attendeeEvent, setAttendeeEvent] = useState<ClubEvent>();
	const attendeeIds = new Set(
		data.responses
			.filter(
				(entry) =>
					entry.eventId === attendeeEvent?.id && entry.response === "going",
			)
			.map((entry) => entry.personId),
	);
	const attendees = data.members
		.filter((member) => attendeeIds.has(member.id))
		.toSorted((a, b) => a.name.localeCompare(b.name));
	const dates = [...new Set(events.map((event) => event.date))];
	return (
		<Stack gap="xl">
			<Dialog
				isOpen={Boolean(attendeeEvent)}
				onOpenChange={(open): void => {
					if (!open) setAttendeeEvent(undefined);
				}}
				title={`Attendees${attendeeEvent ? ` · ${attendeeEvent.title}` : ""}`}
			>
				<List>
					{attendees.map((member) => (
						<ListItem
							key={member.id}
							title={member.name}
							avatar={member.name}
						/>
					))}
					{!attendees.length ? (
						<EmptyState
							title="No attendees yet"
							description="Players will appear here when they register."
						/>
					) : undefined}
				</List>
			</Dialog>
			{dates.map((date) => (
				<Stack key={date} gap="xs">
					<Text variant="label">{formatDate(date)}</Text>
					{events
						.filter((event) => event.date === date)
						.map((event) => {
							const going = data.responses.filter(
								(entry) =>
									entry.eventId === event.id && entry.response === "going",
							).length;
							return (
								<EventCard
									key={event.id}
									title={event.title}
									time={formatTime(event.start)}
									endTime={formatTime(event.end)}
									venue={event.venue}
									parts={event.parts?.map((part) => ({
										label: part.title,
										time: formatTime(part.start),
									}))}
									onOpen={(): void =>
										router.push({
											pathname: "/session",
											params: { event: event.id },
										})
									}
									actions={
										<EventActions
											status={<ResponseControl event={event} />}
											attendanceCount={going}
											onAttendance={(): void => setAttendeeEvent(event)}
										/>
									}
								/>
							);
						})}
				</Stack>
			))}
			{!events.length ? (
				<EmptyState
					title="No events"
					description="Try another date or add an event."
				/>
			) : undefined}
		</Stack>
	);
};
