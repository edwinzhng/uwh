import type { GoalDetails } from "./goals";

export type GoalReflection = {
	goalDetails?: GoalDetails;
	goalRevision?: number;
	id: string;
	personId: string;
	goal: string;
	note: string;
	selfRating: number;
	createdAt: number;
	checkIn: number;
};
export type GoalReflectionDraft = {
	goalRevision?: number;
	personId: string;
	requestId: string;
	goal: string;
	expectedSteps: number;
	note: string;
	selfRating: number;
};

export const validateGoalReflection = (
	draft: GoalReflectionDraft,
): string | undefined => {
	if (!draft.goal.trim()) return "Set a goal with your coach first";
	if (
		!Number.isInteger(draft.selfRating) ||
		draft.selfRating < 1 ||
		draft.selfRating > 5
	)
		return "Choose a rating from 1–5";
	if (draft.note.trim().length > 1000)
		return "Keep the reflection to 1,000 characters";
	if (
		!Number.isInteger(draft.expectedSteps) ||
		draft.expectedSteps < 0 ||
		draft.expectedSteps >= 6
	)
		return "Six check-ins complete. Agree a new goal with your coach.";
	if (draft.requestId.length < 16 || draft.requestId.length > 100)
		return "Reopen the check-in";
	return undefined;
};

export const reflectionMatches = (
	reflection: Pick<
		GoalReflection,
		"goal" | "note" | "selfRating" | "goalRevision"
	>,
	draft: GoalReflectionDraft,
): boolean =>
	reflection.goal === draft.goal &&
	(draft.goalRevision === undefined ||
		reflection.goalRevision === draft.goalRevision) &&
	reflection.note === draft.note.trim() &&
	reflection.selfRating === draft.selfRating;
