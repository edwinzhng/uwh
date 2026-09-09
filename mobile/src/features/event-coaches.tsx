import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Combobox,
	Row,
	SectionHeading,
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
import { ConfirmButton } from "./confirm-button";
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
		<Stack gap="sm">
			<SectionHeading>Coaching hours</SectionHeading>
			<Surface>
				<Stack>
					{controls.loading ? (
						<Text tone="secondary">Loading…</Text>
					) : (
						<>
							{controls.assignments.map((assignment) => (
								<Stack key={assignment.coachId} gap="xs">
									<Row justify="between">
										<Text variant="label">{assignment.name}</Text>
										<ConfirmButton
											label="Remove"
											variant="ghost"
											danger
											title="Remove coach?"
											description={`Remove ${assignment.name} and their ${coachingHoursLabel(assignment.durationMinutes)} from this practice?`}
											confirmLabel="Remove coach"
											isDisabled={controls.busy || event.cancelled}
											onConfirm={() =>
												controls.change({
													coachId: assignment.coachId,
													assigned: false,
												})
											}
										/>
									</Row>
									{event.parts?.length ? (
										<Text tone="secondary">
											{coachingHoursLabel(assignment.durationMinutes)} ·{" "}
											{(event.parts ?? [])
												.filter(
													(part) =>
														!assignment.partIds ||
														assignment.partIds.includes(part.id),
												)
												.map((part) => part.title)
												.join(" · ")}
										</Text>
									) : (
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
									)}
								</Stack>
							))}
							{!controls.assignments.length ? (
								<Text variant="small" tone="secondary">
									No coaches assigned
								</Text>
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
		</Stack>
	);
};
const LiveEventCoaches = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => (
	<EventCoachList
		event={event}
		controls={useLiveEventCoaches(event.id, partId)}
	/>
);
const PreviewEventCoaches = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => (
	<EventCoachList
		event={event}
		controls={usePreviewEventCoaches(event, partId)}
	/>
);
export const EventCoaches = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement | undefined => {
	const { source, account } = useApp();
	if (!account.coachPrograms.length || event.kind === "social")
		return undefined;
	return source === "convex" ? (
		<LiveEventCoaches event={event} partId={partId} />
	) : (
		<PreviewEventCoaches event={event} partId={partId} />
	);
};
