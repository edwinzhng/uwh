import { type ReactElement, useState } from "react";
import type { SessionPlanService } from "../backend/use-session-plan";
import {
	Button,
	Dialog,
	Disclosure,
	Field,
	RichTextField,
	Stack,
	Text,
} from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import {
	maxSessionPlanBodyLength,
	normalizeSessionPlan,
	type SessionPlan,
	validateSessionPlan,
} from "../domain/session-plan";
import { SessionDrillMediaEditor } from "./session-drill-media-editor";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const SessionPlanEditor = ({
	event,
	partId,
	plan,
	save,
	onClose,
}: {
	event: ClubEvent;
	partId?: string;
	plan: SessionPlan;
	save: SessionPlanService["save"];
	onClose: () => void;
}): ReactElement => {
	const [draft, setDraft] = useState(plan);
	const task = useFormTask();
	const operationKey = useOperationKey();

	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title="Plan"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save plan"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() => validateSessionPlan(draft),
							async (): Promise<void> => {
								await save({
									...normalizeSessionPlan(draft),
									revision: draft.revision,
									eventId: event.id,
									partId,
									requestId: operationKey(
										JSON.stringify({
											eventId: event.id,
											partId,
											...normalizeSessionPlan(draft),
										}),
									),
								});
								onClose();
							},
						);
					}}
				/>
			}
		>
			<Stack>
				<Text variant="small" tone="secondary">
					{event.title} · Private draft
				</Text>
				<RichTextField
					label="Plan"
					value={draft.body}
					onValueChange={(body): void => setDraft({ ...draft, body })}
					placeholder="Write the session plan…"
					maxLength={maxSessionPlanBodyLength}
					isDisabled={task.busy}
				/>
				<SessionDrillMediaEditor
					media={draft.media}
					disabled={task.busy}
					onChange={(media): void =>
						setDraft((current) => ({ ...current, media }))
					}
				/>
				<Disclosure
					title="Private coaching notes"
					summary={draft.notes ? "Notes added · coaches only" : "Coaches only"}
					isDisabled={task.busy}
				>
					<Field
						label="Notes"
						value={draft.notes}
						onValueChange={(notes): void => setDraft({ ...draft, notes })}
						multiline
						maxLength={10000}
						isDisabled={task.busy}
					/>
				</Disclosure>
				{plan.revision !== draft.revision ? (
					<Button
						label="Reload saved plan"
						variant="secondary"
						isDisabled={task.busy}
						onPress={(): void => {
							setDraft(plan);
							task.clear();
						}}
					/>
				) : undefined}
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
