import { type ReactElement, useState } from "react";
import { IconButton, ListItem, Row } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import {
	type CoachingAssignment,
	coachingAssignmentSummary,
	coachingHoursLabel,
	practiceCoachingDuration,
} from "../domain/coaching-hours";
import { CoachingHoursEditor } from "./coaching-hours-editor";
import { ConfirmButton } from "./confirm-button";
import type { EventCoachControls } from "./use-event-coaches";

export const EventCoachAssignment = ({
	event,
	assignment,
	controls,
}: {
	event: ClubEvent;
	assignment: CoachingAssignment;
	controls: EventCoachControls;
}): ReactElement => {
	const [editing, setEditing] = useState(false);
	const isDisabled = controls.busy || event.cancelled;
	return (
		<>
			<ListItem
				avatar={assignment.name}
				avatarId={assignment.personId}
				title={assignment.name}
				description={coachingAssignmentSummary(event, assignment)}
				flush
				trailing={
					<Row gap="none">
						{!event.parts?.length ? (
							<IconButton
								label={`Edit coaching hours for ${assignment.name}`}
								icon="edit"
								isDisabled={isDisabled}
								onPress={(): void => setEditing(true)}
							/>
						) : undefined}
						<ConfirmButton
							label={`Remove ${assignment.name} from this practice`}
							icon="trash"
							variant="ghost"
							danger
							title="Remove coach?"
							description={`Remove ${assignment.name} and their ${coachingHoursLabel(assignment.durationMinutes)} from this practice?`}
							confirmLabel="Remove coach"
							isDisabled={isDisabled}
							onConfirm={() =>
								controls.change({
									coachId: assignment.coachId,
									assigned: false,
								})
							}
						/>
					</Row>
				}
			/>
			{editing ? (
				<CoachingHoursEditor
					assignment={assignment}
					scheduledMinutes={practiceCoachingDuration(event)}
					isDisabled={isDisabled}
					onSave={(durationMinutes) =>
						controls.change({
							coachId: assignment.coachId,
							assigned: true,
							durationMinutes,
						})
					}
					onClose={(): void => setEditing(false)}
				/>
			) : undefined}
		</>
	);
};
