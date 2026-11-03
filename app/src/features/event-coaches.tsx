import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	LoadingContent,
	MultiSelect,
	Stack,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import { maxPracticeCoaches } from "../domain/coaching-hours";
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
}): ReactElement => (
	<Stack gap="sm">
		{controls.loading ? (
			<LoadingContent />
		) : (
			<MultiSelect
				label="Coaches"
				placeholder="Choose coaches"
				values={controls.assignments.map((entry) => entry.coachId)}
				options={[
					...controls.coaches,
					...controls.assignments.filter(
						(assignment) =>
							!controls.coaches.some(
								(coach) => coach.coachId === assignment.coachId,
							),
					),
				].map((coach) => ({
					value: coach.coachId,
					label: coach.name,
					person: { id: coach.personId },
					isDisabled: !controls.coaches.some(
						(entry) => entry.coachId === coach.coachId,
					),
				}))}
				maxSelections={maxPracticeCoaches}
				isDisabled={event.cancelled}
				isBusy={controls.busy}
				onToggle={(coachId, assigned): void => {
					void controls.change({ coachId, assigned });
				}}
			/>
		)}
		{controls.error ? <Text tone="danger">{controls.error}</Text> : undefined}
	</Stack>
);
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
				compact
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
					<EventCoachList event={event} controls={controls} />
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
