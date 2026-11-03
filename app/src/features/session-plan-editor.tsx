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
	moveSessionDrill,
	normalizeSessionPlan,
	type SessionPlan,
	validateSessionPlan,
} from "../domain/session-plan";
import { SessionDrillEditor } from "./session-drill-editor";
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
	const [draft, setDraft] = useState({
		...plan,
		body: plan.body ?? "",
		goals: plan.goals ?? plan.objective,
		objective: "",
	});
	const [revealErrors, setRevealErrors] = useState(false);
	const task = useFormTask();
	const operationKey = useOperationKey();

	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title="Session plan"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save plan"
					isLoading={task.busy}
					onPress={(): void => {
						setRevealErrors(true);
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
					maxLength={20000}
					isDisabled={task.busy}
				/>
				<Field
					label="Goals / game focus"
					value={draft.goals}
					onValueChange={(goals): void => setDraft({ ...draft, goals })}
					placeholder={
						"Game focus\n- Stay tight on the bottom\n- Sub on the fly\n- Balance the load"
					}
					multiline
					rows={5}
					maxLength={10000}
					isDisabled={task.busy}
				/>
				{draft.drills.length ? (
					<Disclosure
						title="Existing drills and attachments"
						summary={`${draft.drills.length} saved drills`}
						isDisabled={task.busy}
					>
						<Stack>
							{draft.drills.map((drill, index) => (
								<SessionDrillEditor
									key={drill.id}
									drill={drill}
									index={index}
									count={draft.drills.length}
									disabled={task.busy}
									revealErrors={revealErrors}
									onChange={(next): void =>
										setDraft({
											...draft,
											drills: draft.drills.map((entry) =>
												entry.id === drill.id ? next : entry,
											),
										})
									}
									onMove={(direction): void =>
										setDraft({
											...draft,
											drills: moveSessionDrill(
												draft.drills,
												drill.id,
												direction,
											),
										})
									}
									onRemove={(): void =>
										setDraft({
											...draft,
											drills: draft.drills.filter(
												(entry) => entry.id !== drill.id,
											),
										})
									}
								/>
							))}
						</Stack>
					</Disclosure>
				) : undefined}
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
							setDraft({
								...plan,
								body: plan.body ?? "",
								goals: plan.goals ?? plan.objective,
								objective: "",
							});
							setRevealErrors(false);
							task.clear();
						}}
					/>
				) : undefined}
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
