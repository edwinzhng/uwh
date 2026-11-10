import type { ReactElement } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	Badge,
	Button,
	Divider,
	RoleScope,
	Row,
	Stack,
	Text,
} from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { goalCategoryLabel } from "../domain/goals";
export const GoalRequest = ({
	member,
}: {
	member: Member;
}): ReactElement | undefined => {
	const { account, dispatch } = useApp();
	const { busy } = useAppStatus();
	const goal = member.pendingGoal;
	if (!goal) return undefined;
	const canReview =
		account.personId !== member.id && canCoachMember(account, member);
	return (
		<Stack gap="sm">
			<Divider />
			<Badge label="Awaiting coach approval" kind="pending" />
			<Text variant="small">{goal}</Text>
			{member.pendingGoalDetails ? (
				<Text variant="small" tone="secondary">
					{goalCategoryLabel(member.pendingGoalDetails)}
					{member.pendingGoalDetails.remarks
						? ` · ${member.pendingGoalDetails.remarks}`
						: ""}
				</Text>
			) : undefined}
			{canReview ? (
				<RoleScope tone="coach">
					<Row>
						<Button
							label="Approve"
							compact
							isDisabled={busy}
							onPress={(): void => {
								void dispatch({
									type: "review-goal",
									personId: member.id,
									goal,
									approve: true,
									requestRevision: member.pendingGoalRevision ?? 0,
								});
							}}
						/>
						<Button
							label="Decline"
							compact
							variant="secondary"
							isDisabled={busy}
							onPress={(): void => {
								void dispatch({
									type: "review-goal",
									personId: member.id,
									goal,
									approve: false,
									requestRevision: member.pendingGoalRevision ?? 0,
								});
							}}
						/>
					</Row>
				</RoleScope>
			) : undefined}
		</Stack>
	);
};
