import { type ReactElement, useState } from "react";
import type { GoalReflectionService } from "../backend/use-goal-reflections";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { validateGoalReflection } from "../domain/goal-reflections";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const GoalReflectionForm = ({
	member,
	record,
	onClose,
}: {
	member: Member;
	record: GoalReflectionService["record"];
	onClose: () => void;
}): ReactElement => {
	const operationKey = useOperationKey();
	const [goal] = useState(member.goal);
	const [goalRevision] = useState(member.goalRevision ?? 0);
	const [expectedSteps] = useState(member.steps);
	const [rating, setRating] = useState<string>();
	const [note, setNote] = useState("");
	const task = useFormTask();
	const submit = (): void => {
		const requestId = operationKey(
			JSON.stringify({
				personId: member.id,
				goal,
				goalRevision,
				selfRating: Number(rating),
				note: note.trim(),
			}),
		);
		const draft = {
			personId: member.id,
			requestId,
			goal,
			goalRevision,
			expectedSteps,
			selfRating: Number(rating),
			note,
		};
		void task.submit(
			() => validateGoalReflection(draft),
			async (): Promise<void> => {
				await record(draft);
				onClose();
			},
		);
	};
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title="Goal check-in"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button label="Save check-in" isLoading={task.busy} onPress={submit} />
			}
		>
			<Stack>
				<Text>{goal}</Text>
				<Select
					label="How is your goal going?"
					value={rating}
					onValueChange={setRating}
					isDisabled={task.busy}
					placeholder="Choose a rating"
					options={[
						{ value: "1", label: "1 · Finding it difficult" },
						{ value: "2", label: "2 · Getting started" },
						{ value: "3", label: "3 · Making progress" },
						{ value: "4", label: "4 · Going well" },
						{ value: "5", label: "5 · Feeling confident" },
					]}
				/>
				<Field
					label="Reflection · optional"
					value={note}
					onValueChange={setNote}
					multiline
					maxLength={1000}
					isDisabled={task.busy}
				/>
				<Text variant="small" tone="secondary">
					Shared with your coaches and linked guardians. Saving adds one goal
					check-in.
				</Text>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
