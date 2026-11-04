import type { CoachingFeedback } from "./app-types";
import { feedbackKind } from "./feedback-access";

export type HomeFeedbackHighlight = { kind: "note"; entry: CoachingFeedback };

export const homeCoachNotes = (
	entries: readonly CoachingFeedback[],
	personId: string,
): CoachingFeedback[] =>
	entries
		.filter(
			(entry) =>
				entry.personId === personId &&
				entry.visibility === "published" &&
				feedbackKind(entry) === "coaching" &&
				entry.body.trim().length > 0,
		)
		.sort((left, right) => right.date.localeCompare(left.date));

export const homeFeedbackHighlight = (
	notes: readonly CoachingFeedback[],
	personId: string,
): HomeFeedbackHighlight | undefined => {
	const entry = homeCoachNotes(notes, personId).at(0);
	return entry ? { kind: "note", entry } : undefined;
};
