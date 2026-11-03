export type TermsDraft = { version: string; title: string; body: string };
export type TermsPolicy = TermsDraft & { id: string; publishedAt: number };
export type TermsState = {
	policy?: TermsPolicy;
	required: boolean;
	accepted: boolean;
	acceptedAt?: number;
	revision: number;
	canManage: boolean;
};
export const normalizeTerms = (draft: TermsDraft): TermsDraft => ({
	version: draft.version.trim(),
	title: draft.title.trim(),
	body: draft.body.trim(),
});
export const termsError = (draft: TermsDraft): string | undefined => {
	if (!draft.version.trim()) return "Add a version";
	if (draft.version.trim().length > 40)
		return "Keep the version to 40 characters";
	if (!/^[a-zA-Z0-9]/.test(draft.version.trim()))
		return "Start the version with a letter or number";
	if (!/^[a-zA-Z0-9 ._-]+$/.test(draft.version.trim()))
		return "Use letters, numbers, spaces, dots, dashes or underscores";
	if (!draft.title.trim()) return "Add a title";
	if (draft.title.trim().length > 120)
		return "Keep the title to 120 characters";
	if (!draft.body.trim()) return "Add the approved policy text";
	if (draft.body.trim().length > 30000)
		return "Keep policy text to 30,000 characters";
	return undefined;
};
