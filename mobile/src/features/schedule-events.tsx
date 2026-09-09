import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EventActions, EventCard, Stack, Text } from "../design-system";
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
	const dates = [...new Set(events.map((event) => event.date))];
	return (
		<Stack gap="lg">
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
											onAttendance={(): void =>
												router.push({
													pathname: "/session",
													params: { event: event.id, tab: "people" },
												})
											}
										/>
									}
								/>
							);
						})}
				</Stack>
			))}
			{!events.length ? (
				<Text variant="small" tone="secondary">
					No events
				</Text>
			) : undefined}
		</Stack>
	);
};
