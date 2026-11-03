import type { DevelopmentCoach } from "./development";

export type DevelopmentPolicy = {
	revision: number;
	mode: "regular" | "selected";
	reviewerIds: string[];
};
export const defaultDevelopmentPolicy = (): DevelopmentPolicy => ({
	revision: 0,
	mode: "regular",
	reviewerIds: [],
});
export const developmentReviewers = (
	coaches: DevelopmentCoach[],
	policy: DevelopmentPolicy,
	backupIds: string[],
	scheduledIds: string[],
): DevelopmentCoach[] =>
	coaches.filter((coach) =>
		policy.mode === "selected"
			? policy.reviewerIds.includes(coach.id)
			: !backupIds.includes(coach.id) || scheduledIds.includes(coach.id),
	);
export const validateDevelopmentPolicy = (
	policy: DevelopmentPolicy,
	coaches: DevelopmentCoach[],
): string | undefined => {
	if (!Number.isInteger(policy.revision) || policy.revision < 0)
		return "Reload the reviewer policy.";
	if (
		new Set(policy.reviewerIds).size !== policy.reviewerIds.length ||
		(policy.mode === "selected" &&
			policy.reviewerIds.some(
				(id) => !coaches.some((coach) => coach.id === id),
			))
	)
		return "Choose current club coaches.";
	if (policy.mode === "selected" && policy.reviewerIds.length === 0)
		return "Choose at least one required reviewer.";
	return undefined;
};
