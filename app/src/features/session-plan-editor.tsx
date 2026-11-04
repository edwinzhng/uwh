import { type ReactElement, useState } from "react";
import type { SessionPlanService } from "../backend/use-session-plan";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import type { ClubEvent } from "../domain/app-types";
import {
	normalizeSessionPlan,
	type SessionPlan,
	validateSessionPlan,
} from "../domain/session-plan";
import { SessionPlanBodyEditor } from "./session-plan-body-editor";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const SessionPlanEditor = ({
	event,
	partId,
	plan,
	save,
	images,
	onClose,
}: {
	event: ClubEvent;
	partId?: string;
	plan: SessionPlan;
	save: SessionPlanService["save"];
	images: SessionPlanService["images"];
	onClose: () => void;
}): ReactElement => {
	const [draft, setDraft] = useState<SessionPlan>({
		...plan,
		media: plan.media.filter((media) => media.source === "image"),
	});
	const [uploading, setUploading] = useState(false);
	const task = useFormTask();
	const operationKey = useOperationKey();

	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy || uploading}
			title="Plan"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy && !uploading) onClose();
			}}
			footer={
				<Button
					label="Save plan"
					isLoading={task.busy}
					isDisabled={uploading}
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
				<SessionPlanBodyEditor
					draft={draft}
					onChange={(next): void => setDraft({ ...draft, ...next })}
					images={images}
					disabled={task.busy}
					onBusyChange={setUploading}
				/>
				<Field
					label="Private coaching notes"
					rows={2}
					value={draft.notes}
					onValueChange={(notes): void => setDraft({ ...draft, notes })}
					multiline
					maxLength={10000}
					isDisabled={task.busy || uploading}
				/>
				{plan.revision !== draft.revision ? (
					<Button
						label="Reload saved plan"
						variant="secondary"
						isDisabled={task.busy || uploading}
						onPress={(): void => {
							setDraft({
								...plan,
								media: plan.media.filter((media) => media.source === "image"),
							});
							task.clear();
						}}
					/>
				) : undefined}
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
