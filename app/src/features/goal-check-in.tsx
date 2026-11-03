import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	ActionMenu,
	Button,
	Progress,
	Row,
	Stack,
	Text,
} from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { ConfirmationDialog } from "./confirmation-dialog";
import { GoalReflectionsLive } from "./goal-reflections-live";
import { GoalReflectionsPreview } from "./goal-reflections-preview";
import { useReviewFlow } from "./use-review-flow";
import { useTask } from "./use-task";

export const GoalCheckIn = ({ member }: { member: Member }): ReactElement => {
	const { account, dispatch, source } = useApp();
	const { busy } = useAppStatus();
	const [reflection, setReflection] = useState(
		useReviewFlow() === "goal-reflection",
	);
	const task = useTask();
	const [undo, setUndo] = useState<{ goalRevision: number; steps: number }>();
	const canUpdate =
		!member.archived &&
		(account.personId === member.id || canCoachMember(account, member));
	const steps = Math.min(6, Math.max(0, member.steps));
	const undoError =
		undo &&
		(undo.goalRevision !== (member.goalRevision ?? 0) ||
			undo.steps !== member.steps)
			? "Progress changed. Reopen the menu."
			: undefined;
	const update = (delta: number): void => {
		void task.run(async (): Promise<void> => {
			const saved = await dispatch({
				type: "goal-step",
				personId: member.id,
				delta,
			});
			if (!saved) throw new Error("Could not save the check-in. Try again.");
		});
	};
	return (
		<Stack gap="sm">
			<Row justify="between" wrap>
				<Stack grow>
					<Progress label="Goal check-ins" value={steps} max={6} />
				</Stack>
				<Text variant="caption" tone="secondary">
					{steps}/6 check-ins
				</Text>
				{canUpdate ? (
					<ActionMenu
						label="Goal options"
						icon="more"
						isDisabled={busy || task.busy}
						groups={[
							{
								id: "progress",
								items: [
									{
										id: "undo",
										label: "Undo a check-in",
										icon: "reply",
										isDisabled: steps === 0,
										onSelect: (): void =>
											setUndo({
												goalRevision: member.goalRevision ?? 0,
												steps: member.steps,
											}),
									},
								],
							},
						]}
					/>
				) : undefined}
			</Row>
			<Row justify="between" wrap>
				{source === "convex" ? (
					<GoalReflectionsLive
						member={member}
						open={reflection}
						onClose={(): void => setReflection(false)}
					/>
				) : (
					<GoalReflectionsPreview
						member={member}
						open={reflection}
						onClose={(): void => setReflection(false)}
					/>
				)}
				{canUpdate ? (
					<Button
						compact
						label={steps === 6 ? "Complete" : "Check in"}
						variant="solid"
						prefix="check"
						isLoading={task.busy}
						isDisabled={busy || steps === 6}
						onPress={(): void => {
							if (account.personId === member.id) setReflection(true);
							else update(1);
						}}
					/>
				) : undefined}
			</Row>
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			{undo ? (
				<ConfirmationDialog
					title="Undo one check-in?"
					description="Reflections stay in history."
					confirmLabel="Undo check-in"
					isDisabled={busy || task.busy || !canUpdate || steps === 0}
					validationError={undoError}
					onConfirm={async (): Promise<boolean> => {
						if (undoError) throw new Error(undoError);
						return dispatch({
							type: "goal-step",
							personId: member.id,
							delta: -1,
						});
					}}
					onClose={(): void => setUndo(undefined)}
				/>
			) : undefined}
		</Stack>
	);
};
