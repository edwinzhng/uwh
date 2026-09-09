import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { SectionHeading, Stack, Surface, Text } from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { FeedbackEditor } from "./feedback-editor";
import { FeedbackList } from "./feedback-list";
import { GoalEditor } from "./goal-editor";
import { GoalRequest } from "./goal-request";
import { MemberAttendance } from "./member-attendance";

export const MemberProgress = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { account } = useApp();
	const coach = canCoachMember(account, member);
	return (
		<Stack gap="xl">
			<Stack gap="sm">
				<SectionHeading
					action={
						coach || account.personId === member.id ? (
							<GoalEditor key={member.id} member={member} />
						) : undefined
					}
				>
					Current goal
				</SectionHeading>
				<Surface>
					<Stack>
						<Text>{member.goal || "No goal yet"}</Text>
						<GoalRequest member={member} />
						<Text variant="caption" tone="secondary">
							Shared with your coaches
						</Text>
					</Stack>
				</Surface>
			</Stack>
			<Stack gap="sm">
				<SectionHeading
					action={
						coach ? (
							<FeedbackEditor key={member.id} personId={member.id} />
						) : undefined
					}
				>
					Feedback
				</SectionHeading>
				<Surface>
					<Stack gap="sm">
						<FeedbackList
							personId={member.id}
							visibility="published"
							embedded
						/>
						{coach ? (
							<FeedbackList
								personId={member.id}
								visibility="private"
								embedded
								hideEmpty
							/>
						) : undefined}
					</Stack>
				</Surface>
			</Stack>

			<MemberAttendance key={member.id} member={member} />
		</Stack>
	);
};
