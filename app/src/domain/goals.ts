import { canCoachMember } from "./app-rules";
import type { Account, AppAction, Member } from "./app-types";

export const goalCategories = [
	{ value: "fitness", label: "Fitness" },
	{ value: "breath-hold", label: "Breath hold" },
	{ value: "stick-skills", label: "Stick skills" },
	{ value: "shooting", label: "Shooting" },
	{ value: "positioning", label: "Positioning" },
	{ value: "team-tactics", label: "Team tactics" },
	{ value: "game-awareness", label: "Game awareness" },
	{ value: "communication", label: "Communication" },
	{ value: "other", label: "Other" },
] as const;
export type GoalCategory = (typeof goalCategories)[number]["value"];
export type GoalDetails = { category: GoalCategory; remarks: string };
export type GoalAction = Extract<
	AppAction,
	{ type: "set-goal" | "request-goal" | "review-goal" }
>;
export const goalCategoryLabel = (details?: GoalDetails): string | undefined =>
	goalCategories.find((category) => category.value === details?.category)
		?.label;
export const validateGoal = (
	goal: string,
	details?: GoalDetails,
): string | undefined => {
	if (!goal.trim()) return "Add a goal";
	if (goal.trim().length > 500) return "Keep the goal to 500 characters";
	if (
		details &&
		!goalCategories.some((category) => category.value === details.category)
	)
		return "Choose a goal category";
	if (details && details.remarks.trim().length > 1000)
		return "Keep remarks to 1,000 characters";
	return undefined;
};
export const sameGoalDetails = (
	left?: GoalDetails,
	right?: GoalDetails,
): boolean =>
	left?.category === right?.category &&
	(left?.remarks.trim() ?? "") === (right?.remarks.trim() ?? "");
export const updateGoal = (
	member: Member | undefined,
	account: Account,
	action: GoalAction,
): Member => {
	if (!member || member.archived)
		throw new Error("Restore the player before updating their goal.");
	const allowed =
		action.type === "request-goal"
			? account.personId === member.id
			: canCoachMember(account, member) &&
				(action.type !== "review-goal" || account.personId !== member.id);
	if (!allowed) throw new Error("You don’t have access to this action.");
	if (action.type === "review-goal") {
		if (
			!member.pendingGoal ||
			member.pendingGoal !== action.goal ||
			(action.requestRevision !== undefined &&
				action.requestRevision !== (member.pendingGoalRevision ?? 0)) ||
			(member.pendingGoalDetails && action.requestRevision === undefined)
		)
			throw new Error("This request has changed. Review the latest goal.");
		return {
			...member,
			goal: action.approve ? member.pendingGoal : member.goal,
			goalDetails: action.approve
				? member.pendingGoalDetails
				: member.goalDetails,
			goalRevision: (member.goalRevision ?? 0) + (action.approve ? 1 : 0),
			steps: action.approve ? 0 : member.steps,
			pendingGoal: undefined,
			pendingGoalDetails: undefined,
			pendingGoalRevision: (member.pendingGoalRevision ?? 0) + 1,
		};
	}
	const error = validateGoal(action.goal, action.details);
	if (error) throw new Error(error);
	if (
		action.expectedRevision !== undefined &&
		action.expectedRevision !== (member.goalRevision ?? 0)
	)
		throw new Error("The goal changed. Reopen it before saving.");
	const details = action.details
		? { ...action.details, remarks: action.details.remarks.trim() }
		: undefined;
	if (action.type === "request-goal") {
		if (
			action.expectedPendingRevision !== undefined &&
			action.expectedPendingRevision !== (member.pendingGoalRevision ?? 0)
		)
			throw new Error("Your request changed. Reopen it before saving.");
		if (
			action.goal.trim() === member.goal &&
			sameGoalDetails(details, member.goalDetails)
		)
			throw new Error("Propose a different goal");
		return {
			...member,
			pendingGoal: action.goal.trim(),
			pendingGoalDetails: details,
			pendingGoalRevision: (member.pendingGoalRevision ?? 0) + 1,
		};
	}
	return {
		...member,
		goal: action.goal.trim(),
		goalDetails: details,
		goalRevision: (member.goalRevision ?? 0) + 1,
		steps: 0,
		pendingGoal: undefined,
		pendingGoalDetails: undefined,
	};
};
