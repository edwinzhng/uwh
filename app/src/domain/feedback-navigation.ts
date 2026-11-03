export type FeedbackSection = "coach" | "self" | "videos";

export const feedbackSection = (
	value: string | undefined,
	fallback: FeedbackSection = "coach",
): FeedbackSection =>
	value === "coach" || value === "self" || value === "videos"
		? value
		: fallback;
