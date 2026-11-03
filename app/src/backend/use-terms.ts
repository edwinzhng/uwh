import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useStore } from "jotai";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { previewAccountAtom } from "../demo/app-state";
import {
	previewTermsAcceptances,
	previewTermsPolicy,
	previewTermsReceipts,
	previewTermsVersions,
} from "../demo/terms-state";
import {
	normalizeTerms,
	type TermsDraft,
	type TermsState,
	termsError,
} from "../domain/terms";

export type TermsService = {
	state?: TermsState;
	accept: (policyId: string, confirmed: boolean) => Promise<void>;
	publish: (
		draft: TermsDraft,
		revision: number,
		key: string,
		confirmed: boolean,
	) => Promise<void>;
	setRequired: (required: boolean, revision: number) => Promise<void>;
};
export const useLiveTerms = (): TermsService => {
	const state = useQuery(api.terms.current, {});
	const accept = useMutation(api.terms.accept);
	const publish = useMutation(api.terms.publish);
	const setRequired = useMutation(api.terms.setRequired);
	return {
		state,
		accept: async (policyId, confirmed): Promise<void> => {
			await accept({ policyId: policyId as Id<"termsVersions">, confirmed });
		},
		publish: async (draft, revision, key, confirmed): Promise<void> => {
			await publish({ ...draft, revision, key, confirmed });
		},
		setRequired: async (required, revision): Promise<void> => {
			await setRequired({ required, revision });
		},
	};
};
export const usePreviewTerms = (): TermsService => {
	const store = useStore();
	const value = useAtomValue(previewTermsPolicy);
	const account = useAtomValue(previewAccountAtom);
	const acceptances = useAtomValue(previewTermsAcceptances);
	const acceptedAt = acceptances[`${account.id}:${value.policy.id}`];
	return {
		state: {
			...value,
			accepted: !value.required || Boolean(acceptedAt),
			acceptedAt,
			canManage: account.admin,
		},
		accept: async (policyId, confirmed): Promise<void> => {
			const current = store.get(previewTermsPolicy);
			if (!confirmed || !current.required || current.policy.id !== policyId)
				throw new Error(
					"Review and agree to the current version before continuing.",
				);
			const key = `${store.get(previewAccountAtom).id}:${policyId}`;
			store.set(previewTermsAcceptances, (previous) => ({
				...previous,
				[key]: previous[key] ?? Date.now(),
			}));
		},
		publish: async (input, revision, key, confirmed): Promise<void> => {
			const actor = store.get(previewAccountAtom);
			if (!actor.admin || !confirmed)
				throw new Error(
					"Administrator approval is required to publish club terms.",
				);
			const draft = normalizeTerms(input);
			const error = termsError(draft);
			if (error) throw new Error(error);
			const payload = JSON.stringify(draft);
			const receiptKey = `${actor.id}:${key}`;
			const receipt = store.get(previewTermsReceipts)[receiptKey];
			if (receipt) {
				if (receipt.payload !== payload)
					throw new Error("This request was used for different terms.");
				return;
			}
			const current = store.get(previewTermsPolicy);
			if (current.revision !== revision)
				throw new Error("The club policy changed. Reopen before publishing.");
			if (store.get(previewTermsVersions).includes(draft.version))
				throw new Error("Use a new version for changed terms.");
			const id = `preview-policy-${key}`;
			store.set(previewTermsPolicy, {
				policy: { ...draft, id, publishedAt: Date.now() },
				revision: revision + 1,
				required: true,
			});
			store.set(previewTermsVersions, [
				...store.get(previewTermsVersions),
				draft.version,
			]);
			store.set(previewTermsReceipts, {
				...store.get(previewTermsReceipts),
				[receiptKey]: { payload, id },
			});
		},
		setRequired: async (required, revision): Promise<void> => {
			const current = store.get(previewTermsPolicy);
			if (!store.get(previewAccountAtom).admin || current.revision !== revision)
				throw new Error(
					"The club policy changed or you no longer have access.",
				);
			store.set(previewTermsPolicy, {
				...current,
				required,
				revision: revision + 1,
			});
		},
	};
};
