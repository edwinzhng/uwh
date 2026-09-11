import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import type { Member } from "../domain/app-types";

export const GoalEditor = ({ member }: { member: Member }): ReactElement => {
	const { dispatch, busy, account } = useApp();
	const proposed = member.id === account.personId;
	const [open, setOpen] = useState(false);
	const [goal, setGoal] = useState(member.goal);
	return (
		<>
			<Button
				compact
				staffRole={proposed ? undefined : "coach"}
				label={
					proposed
						? member.pendingGoal
							? "Edit request"
							: "Suggest goal"
						: member.goal
							? "Change goal"
							: "Set goal"
				}
				variant="ghost"
				onPress={(): void => {
					setGoal(proposed ? (member.pendingGoal ?? member.goal) : member.goal);
					setOpen(true);
				}}
			/>
			<Dialog
				staffRole={proposed ? undefined : "coach"}
				title={proposed ? "Suggest a goal" : `Goal · ${member.name}`}
				isOpen={open}
				onOpenChange={setOpen}
				footer={
					<Button
						label={proposed ? "Submit for approval" : "Save goal"}
						isLoading={busy}
						validationError={
							!goal.trim() || goal.trim() === member.goal || goal.length > 500
								? "Check the required fields"
								: undefined
						}
						onPress={(): void => {
							void dispatch({
								type: proposed ? "request-goal" : "set-goal",
								personId: member.id,
								goal,
							}).then((saved): void => {
								if (saved) setOpen(false);
							});
						}}
					/>
				}
			>
				<Stack>
					<Field
						label="Focus"
						value={goal}
						onValueChange={setGoal}
						multiline
						placeholder="One clear thing to work on"
					/>
					<Text variant="small" tone="secondary">
						{proposed
							? "Your coach will review this before it becomes your goal."
							: `Shared with ${member.name}, guardians, and coaches.`}
					</Text>
				</Stack>
			</Dialog>
		</>
	);
};
