import { canCoachMember } from "../domain/app-rules";
import type { Account, Member } from "../domain/app-types";
import { displayDate } from "../domain/date-display";
import {
	canWriteSessionPerformance,
	type SessionPerformanceEntry,
} from "../domain/session-performance";

export type SessionFeedbackAction = "self" | "note";
export const sessionFeedbackActions = (
	account: Account,
	member: Member,
): { id: SessionFeedbackAction; label: string }[] => [
	...(canWriteSessionPerformance(account, member, "self")
		? [{ id: "self" as const, label: "Rate yourself" }]
		: []),
	...(canCoachMember(account, member)
		? [{ id: "note" as const, label: "Feedback" }]
		: []),
];

export const sessionRatingMetadata = (
	entry: Pick<
		SessionPerformanceEntry,
		"sessionNumber" | "eventDate" | "dateKind" | "authorName"
	>,
): string =>
	[
		entry.sessionNumber === undefined || entry.dateKind === "recorded"
			? undefined
			: `Session ${entry.sessionNumber}`,
		`${entry.dateKind === "recorded" ? "Recorded " : ""}${displayDate(entry.eventDate)}`,
		entry.authorName,
	]
		.filter(Boolean)
		.join(" · ");

export const chronologicalSessionRatings = (
	entries: readonly SessionPerformanceEntry[],
): SessionPerformanceEntry[] =>
	entries
		.slice()
		.sort(
			(left, right) =>
				right.eventDate.localeCompare(left.eventDate) ||
				right.updatedAt - left.updatedAt ||
				left.id.localeCompare(right.id),
		);
