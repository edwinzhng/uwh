import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Badge, Button, Divider, Row, Stack, Text } from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
export const GoalRequest = ({
	member,
}: {
	member: Member;
}): ReactElement | undefined => {
	const { account, busy, dispatch } = useApp();
	const goal = member.pendingGoal;
	if (!goal) return undefined;
	const canReview =
		account.personId !== member.id && canCoachMember(account, member);
	return (
		<Stack gap="sm">
			<Divider />
			<Badge label="Awaiting coach approval" kind="pending" />
			<Text variant="small">{goal}</Text>
			{canReview ? (
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
							});
						}}
					/>
				</Row>
			) : undefined}
		</Stack>
	);
};
