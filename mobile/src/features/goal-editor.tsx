import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import type { Member } from "../domain/app-types";

export const GoalEditor = ({ member }: { member: Member }): ReactElement => {
	const { dispatch, busy } = useApp();
	const [open, setOpen] = useState(false);
	const [goal, setGoal] = useState(member.goal);
	return (
		<>
			<Button
				staffRole="coach"
				label={member.goal ? "Change goal" : "Set goal"}
				variant="ghost"
				onPress={(): void => {
					setGoal(member.goal);
					setOpen(true);
				}}
			/>
			<Dialog
				staffRole="coach"
				title={`Goal · ${member.name}`}
				isOpen={open}
				onOpenChange={setOpen}
				footer={
					<Button
						label="Save goal"
						isLoading={busy}
						isDisabled={
							!goal.trim() || goal.trim() === member.goal || goal.length > 500
						}
						onPress={(): void => {
							void dispatch({
								type: "set-goal",
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
						Shared with {member.name} and guardians. Resets check-ins.
					</Text>
				</Stack>
			</Dialog>
		</>
	);
};
