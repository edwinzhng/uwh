import type { CoachingFeedback } from "./app-types";
import { feedbackKind } from "./feedback-access";
import type { SessionPerformanceEntry } from "./session-performance";

export type HomeFeedbackHighlight =
	| { kind: "note"; entry: CoachingFeedback }
	| { kind: "rating"; entry: SessionPerformanceEntry };

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
	ratings: readonly SessionPerformanceEntry[],
	personId: string,
): HomeFeedbackHighlight | undefined => {
	const note = homeCoachNotes(notes, personId).at(0);
	const rating = ratings
		.filter(
			(entry) =>
				entry.personId === personId && entry.kind === "coach" && !entry.removed,
		)
		.sort(
			(left, right) =>
				right.eventDate.localeCompare(left.eventDate) ||
				right.updatedAt - left.updatedAt,
		)
		.at(0);
	return note && (!rating || note.date >= rating.eventDate)
		? { kind: "note", entry: note }
		: rating
			? { kind: "rating", entry: rating }
			: undefined;
};
