export type ContentKind =
	| "resource"
	| "comment"
	| "feedback"
	| "profile"
	| "notice"
	| "sessionPlan";
export type ContentReference = {
	kind: ContentKind;
	id: string;
	revision?: number;
};

const textFields = new Set([
	"body",
	"title",
	"name",
	"description",
	"notes",
	"comments",
	"question",
	"label",
	"goal",
	"voiceTranscript",
]);

export const submittedContentText = (value: unknown): string[] => {
	if (Array.isArray(value)) return value.flatMap(submittedContentText);
	if (typeof value !== "object" || value === null) return [];
	return Object.entries(value).flatMap(([key, entry]) =>
		typeof entry === "string"
			? textFields.has(key)
				? [entry]
				: []
			: submittedContentText(entry),
	);
};
