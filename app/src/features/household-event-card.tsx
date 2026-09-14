import { useRouter } from "expo-router";
import { Fragment, type ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Divider,
	Icon,
	List,
	ListItem,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { eventResponse, formatDate, formatTime } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { eventKindLabel, practiceEvent } from "../domain/event-types";
import { householdAttendanceReason, householdMembers } from "../domain/home";
import { ResponseControl } from "./response-control";

export const HouseholdEventCard = ({
	event,
	attendanceCount,
	onAttendance,
}: {
	event: ClubEvent;
	attendanceCount?: number;
	onAttendance?: () => void;
}): ReactElement => {
	const { data, account } = useApp();
	const router = useRouter();
	const people = householdMembers(data, account);
	return (
		<Surface>
			<Stack>
				<Row justify="between" wrap>
					<Row gap="xs" wrap>
						{event.kind === "tournament" ? (
							<Icon name="trophy" size="sm" />
						) : undefined}
						<Text variant="h4">{event.title}</Text>
						{onAttendance ? (
							<Button
								label={`${attendanceCount ?? 0} ${event.kind === "tournament" ? "interested" : "going"}`}
								prefix="users"
								variant="secondary"
								onPress={onAttendance}
							/>
						) : undefined}
					</Row>
					<Row gap="xs" wrap>
						{event.cancelled ? (
							<Badge label="Cancelled" kind="warning" />
						) : !practiceEvent(event) ? (
							<Badge label={eventKindLabel(event.kind)} />
						) : undefined}
					</Row>
				</Row>
				<Stack gap="xs">
					<Row gap="xs" align="start">
						<Icon name="clock" size="sm" tone="secondary" />
						<Text variant="small">
							{formatDate(event.date)}
							{event.endDate && event.endDate !== event.date
								? ` – ${formatDate(event.endDate)}`
								: ""}{" "}
							· {formatTime(event.start)}–{formatTime(event.end)}
						</Text>
					</Row>
					<Row gap="xs" align="start">
						<Icon name="mapPin" size="sm" tone="secondary" />
						<Text variant="small">{event.venue}</Text>
					</Row>
				</Stack>
				{event.responseDeadline ? (
					<Text variant="small">
						Respond by {formatDate(event.responseDeadline)}
					</Text>
				) : undefined}
				<List>
					{people.length ? <Divider /> : undefined}
					{people.map((person) => {
						const reason = householdAttendanceReason(person, event);
						const reserved = eventResponse(
							data,
							event.id,
							person.id,
						).seriesExpected;
						return (
							<Fragment key={person.id}>
								<ListItem
									flush
									avatar={person.name}
									title={person.id === account.personId ? "You" : person.name}
									description={
										reason ?? (reserved ? "Reserved place" : undefined)
									}
									trailing={
										reason ? undefined : (
											<ResponseControl
												event={event}
												personId={person.id}
												hideLabel
											/>
										)
									}
								/>
								<Divider />
							</Fragment>
						);
					})}
				</List>
				<Row justify="end">
					<Button
						label="More details"
						variant="secondary"
						onPress={(): void =>
							router.push({ pathname: "/session", params: { event: event.id } })
						}
					/>
				</Row>
			</Stack>
		</Surface>
	);
};
