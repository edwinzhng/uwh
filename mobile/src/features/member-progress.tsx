import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Progress,
	Row,
	Stack,
	StaffSection,
	Surface,
	Text,
} from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { FeedbackEditor } from "./feedback-editor";
import { FeedbackList } from "./feedback-list";
import { GoalCheckins } from "./goal-checkins";
import { GoalEditor } from "./goal-editor";
import { MemberAttendance } from "./member-attendance";

export const MemberProgress = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { account } = useApp();
	const coach = canCoachMember(account, member);
	const own = member.id === account.personId;
	return (
		<Stack gap="lg">
			<Surface>
				<Stack>
					<Row justify="between" wrap>
						<Text variant="h4">Current goal</Text>
						{coach ? (
							<GoalEditor key={member.id} member={member} />
						) : (
							<Badge
								label={member.steps >= 6 ? "Complete" : "In progress"}
								kind={member.steps >= 6 ? "success" : "neutral"}
							/>
						)}
					</Row>
					<Text>{member.goal || "No goal"}</Text>
					<Progress label="Goal check-ins" value={member.steps} max={6} />
					<Row justify="between" wrap>
						<Text variant="small" tone="secondary">
							{member.steps} of 6 check-ins
						</Text>
						{own || coach ? <GoalCheckins member={member} /> : undefined}
					</Row>
				</Stack>
			</Surface>
			<Stack gap="sm">
				<Row justify="between" wrap>
					<Text variant="h4">Feedback</Text>
					{coach ? (
						<FeedbackEditor key={member.id} personId={member.id} />
					) : undefined}
				</Row>
				<FeedbackList personId={member.id} visibility="published" />
			</Stack>
			{coach ? (
				<StaffSection staffRole="coach" title="Drafts & private notes">
					<FeedbackList personId={member.id} visibility="private" />
				</StaffSection>
			) : undefined}
			<MemberAttendance key={member.id} member={member} />
		</Stack>
	);
};
