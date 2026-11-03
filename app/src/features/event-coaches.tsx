import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	ActionMenu,
	Button,
	Dialog,
	EmptyState,
	LoadingContent,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { maxPracticeCoaches } from "../domain/coaching-hours";
import { CoachAssignmentPicker } from "./coach-assignment-picker";
import { ConfirmationDialog } from "./confirmation-dialog";
import { EventCoachAssignment } from "./event-coach-assignment";
import {
	type EventCoachControls,
	useLiveEventCoaches,
	usePreviewEventCoaches,
} from "./use-event-coaches";

const EventCoachList = ({
	event,
	controls,
	heading = true,
}: {
	event: ClubEvent;
	controls: EventCoachControls;
	heading?: boolean;
}): ReactElement => {
	const [resetting, setResetting] = useState(false);
	const available = controls.coaches.filter(
		(coach) =>
			!controls.assignments.some((entry) => entry.coachId === coach.coachId),
	);
	return (
		<Stack gap="sm">
			<Row justify="between">
				{heading ? (
					<SectionHeading>Coaches</SectionHeading>
				) : (
					<Text variant="small" tone="secondary">
						Up to {maxPracticeCoaches} coaches · linked to coaching hours
					</Text>
				)}
				{!controls.loading && !controls.usingWeekly && !event.cancelled ? (
					<ActionMenu
						label="Coaching options"
						accessibilityLabel={`Coaching options for ${event.title}`}
						icon="more"
						isDisabled={controls.busy}
						groups={[
							{
								id: "defaults",
								items: [
									{
										id: "weekly",
										label: "Restore program defaults",
										icon: "calendar",
										onSelect: (): void => setResetting(true),
									},
								],
							},
						]}
					/>
				) : undefined}
			</Row>
			<Surface>
				<Stack>
					{controls.loading ? (
						<LoadingContent />
					) : (
						<>
							<Text variant="small" tone="secondary">
								{controls.usingWeekly
									? "Program defaults · hours not yet recorded"
									: controls.assignments.length > 0
										? "Saved for this practice"
										: "No coaches recorded"}
							</Text>
							{controls.assignments.map((assignment) => (
								<EventCoachAssignment
									key={assignment.coachId}
									event={event}
									assignment={assignment}
									controls={controls}
								/>
							))}
							{controls.usingWeekly &&
							controls.assignments.length > 0 &&
							!event.cancelled ? (
								<Row>
									<Button
										label="Record hours"
										variant="secondary"
										isLoading={controls.busy}
										onPress={(): void => {
											void controls.confirm();
										}}
									/>
								</Row>
							) : undefined}
							{!controls.assignments.length ? (
								<EmptyState
									title="No coaches assigned"
									description="Assign a coach to this practice."
								/>
							) : undefined}
							{available.length > 0 && !event.cancelled ? (
								<CoachAssignmentPicker
									coaches={available}
									backupCoachIds={controls.backupCoachIds}
									isDisabled={
										controls.busy ||
										controls.assignments.length >= maxPracticeCoaches
									}
									onAdd={(coachId) =>
										controls.change({ coachId, assigned: true })
									}
								/>
							) : undefined}
						</>
					)}
					{controls.error ? (
						<Text tone="danger">{controls.error}</Text>
					) : undefined}
				</Stack>
			</Surface>
			{resetting ? (
				<ConfirmationDialog
					title="Restore program coaches?"
					description="Remove this practice’s recorded coach assignments and hours, then restore the program defaults. Record the hours again after checking the coaches."
					confirmLabel="Restore program defaults"
					danger
					isDisabled={controls.busy || event.cancelled}
					onConfirm={controls.useWeekly}
					onClose={(): void => setResetting(false)}
				/>
			) : undefined}
		</Stack>
	);
};
type PresentationProps = {
	event: ClubEvent;
	partId?: string;
	presentation?: "inline" | "button";
	onOpenChange?: (open: boolean) => void;
};
const CoachPresentation = ({
	event,
	controls,
	presentation,
	onOpenChange,
}: PresentationProps & { controls: EventCoachControls }): ReactElement => {
	const [open, setOpen] = useState(false);
	const changeOpen = (value: boolean): void => {
		setOpen(value);
		onOpenChange?.(value);
	};
	return presentation === "button" ? (
		<>
			<Button
				label={`Coaches${controls.loading ? "" : ` · ${controls.assignments.length}`}`}
				prefix="users"
				variant="secondary"
				onPress={(): void => changeOpen(true)}
			/>
			{open ? (
				<Dialog
					title="Practice coaches"
					intent="detail"
					isOpen
					isDismissDisabled={controls.busy}
					onOpenChange={changeOpen}
				>
					<EventCoachList event={event} controls={controls} heading={false} />
				</Dialog>
			) : undefined}
		</>
	) : (
		<EventCoachList event={event} controls={controls} />
	);
};
const LiveEventCoaches = ({
	event,
	partId,
	presentation,
	onOpenChange,
}: PresentationProps): ReactElement => (
	<CoachPresentation
		presentation={presentation}
		onOpenChange={onOpenChange}
		event={event}
		controls={useLiveEventCoaches(event.id, partId)}
	/>
);
const PreviewEventCoaches = ({
	event,
	partId,
	presentation,
	onOpenChange,
}: PresentationProps): ReactElement => (
	<CoachPresentation
		presentation={presentation}
		onOpenChange={onOpenChange}
		event={event}
		controls={usePreviewEventCoaches(event, partId)}
	/>
);
export const EventCoaches = ({
	event,
	partId,
	presentation,
	onOpenChange,
}: PresentationProps): ReactElement | undefined => {
	const { source, account } = useApp();
	if (
		!account.coachPrograms.length ||
		event.kind === "social" ||
		event.kind === "meeting"
	)
		return undefined;
	return source === "convex" ? (
		<LiveEventCoaches
			presentation={presentation}
			onOpenChange={onOpenChange}
			event={event}
			partId={partId}
		/>
	) : (
		<PreviewEventCoaches
			presentation={presentation}
			onOpenChange={onOpenChange}
			event={event}
			partId={partId}
		/>
	);
};
