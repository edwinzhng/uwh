import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { SectionHeading, Stack, Surface } from "../design-system";
import { canCoachMember } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { FeedbackEditor } from "./feedback-editor";
import { FeedbackErrorBoundary } from "./feedback-error-boundary";
import { FeedbackList } from "./feedback-list";
import { PersonalClips } from "./personal-clips";

export const MemberFeedback = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { account, source } = useApp();
	const coach = canCoachMember(account, member);
	return (
		<FeedbackErrorBoundary live={source === "convex"}>
			<Stack gap="lg">
				<SectionHeading
					action={coach ? <FeedbackEditor personId={member.id} /> : undefined}
				>
					Feedback
				</SectionHeading>
				<Surface>
					<FeedbackList
						personId={member.id}
						visibility="published"
						embedded
						compactEmpty
					/>
					{coach ? (
						<FeedbackList
							personId={member.id}
							visibility="private"
							embedded
							hideEmpty
						/>
					) : undefined}
				</Surface>
				<PersonalClips member={member} />
			</Stack>
		</FeedbackErrorBoundary>
	);
};
