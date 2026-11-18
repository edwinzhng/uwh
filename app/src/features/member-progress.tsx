import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Disclosure,
	RoleScope,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { goalCategoryLabel } from "../domain/goals";
import { GoalEditor } from "./goal-editor";
import { GoalRequest } from "./goal-request";
import { SessionPerformance } from "./session-performance";

export const MemberProgress = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { account } = useApp();
	const coach = canCoachMember(account, member);
	return (
		<Stack gap="section">
			<Surface density="compact">
				<Stack gap="sm">
					<Row justify="between" align="start" gap="sm">
						<Stack grow gap="xxs">
							<Text variant="small" tone="secondary">
								Current goal
							</Text>
							{member.goal ? (
								<Text variant="h4">{member.goal}</Text>
							) : (
								<Text variant="small" tone="secondary">
									Set a goal to give your training a focus.
								</Text>
							)}
							{member.goalDetails ? (
								<Text variant="small" tone="secondary">
									{goalCategoryLabel(member.goalDetails)}
								</Text>
							) : undefined}
						</Stack>
						{coach || account.personId === member.id ? (
							<RoleScope
								tone={account.personId === member.id ? undefined : "coach"}
							>
								<GoalEditor key={member.id} member={member} />
							</RoleScope>
						) : undefined}
					</Row>
					{member.goalDetails?.remarks ? (
						<Disclosure title="Coaching remarks">
							<Text variant="small">{member.goalDetails.remarks}</Text>
						</Disclosure>
					) : undefined}
					<GoalRequest member={member} />
				</Stack>
			</Surface>
			<SessionPerformance member={member} />
		</Stack>
	);
};
