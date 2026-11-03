import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { SectionNavigation, Stack, TabContent } from "../design-system";
import type { Member } from "../domain/app-types";
import { feedbackSection } from "../domain/feedback-navigation";
import { PersonalClips } from "./personal-clips";
import { SessionPerformance } from "./session-performance";
import { useReviewFlow } from "./use-review-flow";

export const MemberFeedback = ({
	member,
	navigation = "responsive",
}: {
	member: Member;
	navigation?: "responsive" | "desktop";
}): ReactElement => {
	const { account } = useApp();
	const review = useReviewFlow();
	const params = useLocalSearchParams<{ feedback?: string }>();
	const router = useRouter();
	const section = feedbackSection(
		params.feedback,
		review === "session-self-rating" ? "self" : "coach",
	);
	return (
		<Stack gap="md">
			<SectionNavigation
				compactPresentation={navigation === "desktop" ? "hidden" : "tabs"}
				label="Feedback sections"
				value={section}
				onValueChange={(feedback): void => router.setParams({ feedback })}
				options={[
					{ value: "coach", label: "Coach feedback" },
					{
						value: "self",
						label:
							account.personId === member.id
								? "My reflections"
								: "Player reflections",
					},
					{ value: "videos", label: "Videos" },
				]}
			/>
			<TabContent value={section}>
				{section === "videos" ? (
					<PersonalClips member={member} />
				) : (
					<SessionPerformance
						member={member}
						inlineNotes={section === "coach"}
						visibleKind={section}
					/>
				)}
			</TabContent>
		</Stack>
	);
};
