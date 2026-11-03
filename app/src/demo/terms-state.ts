import { atom } from "jotai";
import type { TermsPolicy } from "../domain/terms";

export const previewTermsPolicy = atom<{
	policy: TermsPolicy;
	revision: number;
	required: boolean;
}>({
	policy: {
		id: "fictional-policy-1",
		version: "review-1",
		title: "Sample club terms",
		body: "Fictional review policy. This sample is not the club’s legal agreement.\n\nTreat other members respectfully. Use the report and block controls for inappropriate content. Share personal information only with its intended audience.\n\nReal club terms must be approved and explicitly published by an administrator. Nothing in this review site records a real legal acceptance.",
		publishedAt: 1792886400000,
	},
	revision: 1,
	required: true,
});
export const previewTermsAcceptances = atom<Record<string, number>>({});
export const previewTermsVersions = atom<string[]>(["review-1"]);
export const previewTermsReceipts = atom<
	Record<string, { payload: string; id: string }>
>({});
