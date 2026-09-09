import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	ListItem,
	Row,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import {
	coachingDurations,
	coachingHoursLabel,
} from "../domain/coaching-hours";
import {
	type EventCoachControls,
	useLiveEventCoaches,
	usePreviewEventCoaches,
} from "./use-event-coaches";

const EventCoachList = ({
	event,
	controls,
}: {
	event: ClubEvent;
	controls: EventCoachControls;
}): ReactElement => {
	const [coachId, setCoachId] = useState<string>();
	const available = controls.coaches.filter(
		(coach) =>
			!controls.assignments.some((entry) => entry.coachId === coach.coachId),
	);
	return (
		<Surface>
			<Stack>
				<Text variant="h4">Coaching hours</Text>
				{controls.loading ? (
					<Text tone="secondary">Loading…</Text>
				) : (
					<>
						{controls.assignments.map((assignment) => (
							<Stack key={assignment.coachId} gap="xs">
								<Row justify="between">
									<Text variant="label">{assignment.name}</Text>
									<Button
										label="Remove"
										variant="ghost"
										isDisabled={controls.busy || event.cancelled}
										onPress={(): void => {
											void controls.change({
												coachId: assignment.coachId,
												assigned: false,
											});
										}}
									/>
								</Row>
								<Select
									label={`Hours · ${assignment.name}`}
									value={String(assignment.durationMinutes)}
									options={coachingDurations.map((minutes) => ({
										value: String(minutes),
										label: coachingHoursLabel(minutes),
									}))}
									isDisabled={controls.busy || event.cancelled}
									onValueChange={(value): void => {
										if (value)
											void controls.change({
												coachId: assignment.coachId,
												assigned: true,
												durationMinutes: Number(value),
											});
									}}
								/>
							</Stack>
						))}
						{!controls.assignments.length ? (
							<ListItem title="No coaches assigned" />
						) : undefined}
						{available.length && !event.cancelled ? (
							<Stack gap="sm">
								<Combobox
									label="Coach"
									placeholder="Find a coach"
									value={coachId}
									options={available.map((coach) => ({
										value: coach.coachId,
										label: coach.name,
									}))}
									onValueChange={setCoachId}
									isDisabled={controls.busy}
								/>
								<Row>
									<Button
										label="Assign coach"
										prefix="plus"
										variant="secondary"
										isDisabled={!coachId || controls.busy}
										onPress={(): void => {
											if (coachId) {
												void controls.change({ coachId, assigned: true });
												setCoachId(undefined);
											}
										}}
									/>
								</Row>
							</Stack>
						) : undefined}
					</>
				)}
				{controls.error ? (
					<Text tone="danger">{controls.error}</Text>
				) : undefined}
			</Stack>
		</Surface>
	);
};
const LiveEventCoaches = ({ event }: { event: ClubEvent }): ReactElement => (
	<EventCoachList event={event} controls={useLiveEventCoaches(event.id)} />
);
const PreviewEventCoaches = ({ event }: { event: ClubEvent }): ReactElement => (
	<EventCoachList event={event} controls={usePreviewEventCoaches(event)} />
);
export const EventCoaches = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement | undefined => {
	const { source, account } = useApp();
	if (!account.coachPrograms.length || event.kind === "social")
		return undefined;
	return source === "convex" ? (
		<LiveEventCoaches event={event} />
	) : (
		<PreviewEventCoaches event={event} />
	);
};
