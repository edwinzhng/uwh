import { canCoachMember, canManagePerson, canReadProgress } from "./app-rules";
import type { Account, CoachingFeedback, Member } from "./app-types";

export const feedbackKind = (
	feedback: CoachingFeedback,
): "coaching" | "shoutout" => feedback.kind ?? "coaching";

export const canReadFeedback = (
	feedback: CoachingFeedback,
	account: Account,
	member: Member | undefined,
): boolean => {
	if (!member) return false;
	if (feedbackKind(feedback) === "shoutout")
		return (
			feedback.visibility === "published" &&
			canManagePerson(account, feedback.personId)
		);
	return feedback.visibility === "published"
		? canReadProgress(account, member)
		: canCoachMember(account, member);
};
