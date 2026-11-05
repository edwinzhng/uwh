const normalizeContent = (text: string): string =>
	text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[\u200B-\u200D\uFEFF]/g, "");
const prohibitedThreats = ["kill yourself", "i will kill you"];

export const contentPolicyError = (
	text: string,
	phrases: readonly string[] = [],
): string | undefined =>
	[...prohibitedThreats, ...phrases].some((phrase) =>
		normalizeContent(text).includes(normalizeContent(phrase)),
	)
		? "This content contains a blocked phrase. Please edit it."
		: undefined;
