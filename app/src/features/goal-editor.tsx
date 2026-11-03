import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import { Button, Dialog, Field, Select, Stack, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import {
	type GoalDetails,
	goalCategories,
	validateGoal,
} from "../domain/goals";
import { useFormTask } from "./use-form-task";
import { useReviewFlow } from "./use-review-flow";

export const GoalEditor = ({ member }: { member: Member }): ReactElement => {
	const { dispatch, account } = useApp();
	const { error } = useAppStatus();
	const proposed = member.id === account.personId;
	const review = useReviewFlow();
	const [open, setOpen] = useState(review === "structured-goal");
	const [goal, setGoal] = useState(member.goal);
	const [details, setDetails] = useState<GoalDetails>(
		member.goalDetails ?? { category: "other", remarks: "" },
	);
	const [revision, setRevision] = useState(member.goalRevision ?? 0);
	const [pendingRevision, setPendingRevision] = useState(
		member.pendingGoalRevision ?? 0,
	);
	const task = useFormTask();
	const save = (): void => {
		void task.submit(
			() => validateGoal(goal, details),
			async (): Promise<void> => {
				if (
					!(await dispatch({
						type: proposed ? "request-goal" : "set-goal",
						...(proposed ? { expectedPendingRevision: pendingRevision } : {}),
						personId: member.id,
						goal,
						details,
						expectedRevision: revision,
					}))
				)
					throw new Error(
						error ?? "Could not save this goal. Reopen it if it changed.",
					);
				setOpen(false);
			},
		);
	};
	return (
		<>
			<Button
				label={member.goal || member.pendingGoal ? "Edit goal" : "Set goal"}
				variant="secondary"
				prefix={member.goal || member.pendingGoal ? "edit" : "plus"}
				isDisabled={member.archived}
				onPress={(): void => {
					setGoal(proposed ? (member.pendingGoal ?? member.goal) : member.goal);
					setDetails(
						(proposed
							? (member.pendingGoalDetails ?? member.goalDetails)
							: member.goalDetails) ?? { category: "other", remarks: "" },
					);
					setRevision(member.goalRevision ?? 0);
					setPendingRevision(member.pendingGoalRevision ?? 0);
					task.clear();
					setOpen(true);
				}}
			/>
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title={`${member.goal || member.pendingGoal ? "Edit goal" : "Set goal"} · ${member.name}`}
				isOpen={open}
				onOpenChange={(next): void => {
					if (!task.busy) setOpen(next);
				}}
				footer={
					<Button
						label={proposed ? "Submit for approval" : "Save goal"}
						isLoading={task.busy}
						onPress={save}
					/>
				}
			>
				<Stack>
					<Select
						label="Category"
						value={details.category}
						options={goalCategories}
						onValueChange={(category): void => {
							if (category) setDetails({ ...details, category });
						}}
						isDisabled={task.busy}
					/>
					<Field
						label="Focus"
						value={goal}
						onValueChange={setGoal}
						multiline
						placeholder="One clear thing to work on"
						maxLength={500}
						isDisabled={task.busy}
					/>
					<Field
						label="Remarks · optional"
						value={details.remarks}
						onValueChange={(remarks): void =>
							setDetails({ ...details, remarks })
						}
						multiline
						maxLength={1000}
						isDisabled={task.busy}
					/>
					<Text variant="small" tone="secondary">
						{proposed
							? "Your coach will review this before it becomes your goal."
							: `Shared with ${member.name}, linked guardians, and coaches. Saving starts a new six-check-in cycle.`}
					</Text>
					{task.error ? (
						<Text tone="danger" variant="small">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
