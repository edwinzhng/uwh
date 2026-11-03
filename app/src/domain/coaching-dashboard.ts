import { canCoach, canCoachMember } from "./app-rules";
import type { Account, CoachingFeedback, Member } from "./app-types";
import { feedbackKind } from "./feedback-access";

export type CoachingTasks = {
	goals: Pick<Member, "id" | "name" | "pendingGoal">[];
	drafts: CoachingFeedback[];
	morePlayers: boolean;
	moreDrafts: boolean;
};

export const coachingTasks = (
	account: Account,
	members: readonly Member[],
	feedback: readonly CoachingFeedback[],
	morePlayers = false,
	moreDrafts = false,
): CoachingTasks => {
	if (!canCoach(account))
		return { goals: [], drafts: [], morePlayers: false, moreDrafts: false };
	const active = [
		...new Map(
			members
				.filter(
					(person) =>
						!person.archived &&
						!person.mergedInto &&
						canCoachMember(account, person),
				)
				.map((person) => [person.id, person]),
		).values(),
	];
	return {
		goals: active
			.filter((person) => Boolean(person.pendingGoal))
			.slice(0, 4)
			.map(({ id, name, pendingGoal }) => ({ id, name, pendingGoal })),
		drafts: feedback
			.filter(
				(entry) =>
					entry.visibility === "draft" &&
					entry.authorId === account.id &&
					feedbackKind(entry) === "coaching" &&
					active.some((person) => person.id === entry.personId),
			)
			.slice(0, 4),
		morePlayers:
			morePlayers ||
			active.filter((person) => Boolean(person.pendingGoal)).length > 4,
		moreDrafts: moreDrafts || feedback.length > 4,
	};
};
