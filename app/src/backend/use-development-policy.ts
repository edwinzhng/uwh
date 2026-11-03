import { useMutation, useQuery } from "convex/react";
import { useAtom, useAtomValue } from "jotai";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import {
	previewDevelopmentCoaches,
	previewDevelopmentPolicy,
	previewDevelopmentReviewers,
} from "../demo/development-state";
import type { DevelopmentCoach } from "../domain/development";
import {
	type DevelopmentPolicy,
	validateDevelopmentPolicy,
} from "../domain/development-policy";

export type DevelopmentPolicyService = {
	policy?: DevelopmentPolicy;
	coaches: DevelopmentCoach[];
	requiredIds: string[];
	save: (policy: DevelopmentPolicy) => Promise<void>;
};
export const useDevelopmentPolicy = (): DevelopmentPolicyService => {
	const state = useQuery(api.development_policy.state, {});
	const save = useMutation(api.development_policy.save);
	return {
		...state,
		coaches: state?.coaches ?? [],
		requiredIds: state?.requiredIds ?? [],
		save: async (policy): Promise<void> => {
			await save(policy);
		},
	};
};
export const usePreviewDevelopmentPolicy = (): DevelopmentPolicyService => {
	const [policy, setPolicy] = useAtom(previewDevelopmentPolicy);
	const reviewers = useAtomValue(previewDevelopmentReviewers);
	const { account } = useApp();
	return {
		policy,
		coaches: previewDevelopmentCoaches,
		requiredIds: reviewers.map((coach) => coach.id),
		save: async (next): Promise<void> => {
			if (!account.admin) throw new Error("Administrator access required.");
			const error = validateDevelopmentPolicy(next, previewDevelopmentCoaches);
			if (error) throw new Error(error);
			setPolicy((current) => {
				if (next.revision !== current.revision)
					throw new Error("The reviewer policy changed. Reload before saving.");
				return {
					...next,
					reviewerIds: next.mode === "selected" ? next.reviewerIds : [],
					revision: next.revision + 1,
				};
			});
		},
	};
};
