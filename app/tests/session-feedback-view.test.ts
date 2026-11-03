import { expect, test } from "bun:test";
import {
	initialAppData,
	previewAccounts,
	primaryAccount,
} from "../src/demo/app-data";
import type { SessionPerformanceEntry } from "../src/domain/session-performance";
import {
	chronologicalSessionRatings,
	sessionFeedbackActions,
	sessionRatingMetadata,
} from "../src/features/session-feedback-view";

const member = initialAppData.members.find((entry) => entry.id === "sam");
const guardian = previewAccounts.find((entry) => entry.id === "jamie");
if (!member || !guardian) throw new Error("Missing feedback fixtures.");

test("feedback actions retain self, guardian, coach and private-note capabilities", (): void => {
	expect(sessionFeedbackActions(guardian, member)).toEqual([
		{ id: "self", label: "Rate yourself" },
	]);
	expect(
		sessionFeedbackActions(primaryAccount, member).map((action) => action.id),
	).toEqual(["coach", "note"]);
	expect(
		sessionFeedbackActions({ ...guardian, children: [], admin: true }, member),
	).toEqual([]);
	expect(
		sessionFeedbackActions(primaryAccount, { ...member, archived: true }).map(
			(action) => action.id,
		),
	).toEqual(["note"]);
});

test("rating metadata uses US dates and only genuine session numbers", (): void => {
	const entry = {
		eventDate: "2026-10-27",
		authorName: "Alex Rivera",
	};
	expect(sessionRatingMetadata(entry)).toBe("Oct 27, 2026 · Alex Rivera");
	expect(sessionRatingMetadata({ ...entry, sessionNumber: 2 })).toBe(
		"Session 2 · Oct 27, 2026 · Alex Rivera",
	);
});

test("unlinked imported ratings label the recorded date rather than inventing a practice date", (): void => {
	expect(
		sessionRatingMetadata({
			eventDate: "2026-10-27",
			dateKind: "recorded",
			sessionNumber: 9,
			authorName: "Source player",
		}),
	).toBe("Recorded Oct 27, 2026 · Source player");
});

test("one chronological rating list preserves source and permission identity without mutating input", (): void => {
	const entry: SessionPerformanceEntry = {
		id: "older",
		personId: member.id,
		eventId: "previous-practice",
		eventTitle: "Previous hockey practice",
		eventDate: "2026-10-20",
		programId: "club",
		kind: "coach",
		authorId: primaryAccount.id,
		authorName: primaryAccount.name,
		rating: 8,
		comments: "Good positioning",
		revision: 1,
		updatedAt: 1,
		canEdit: false,
		canReport: true,
	};
	const own: SessionPerformanceEntry = {
		...entry,
		id: "self",
		kind: "self",
		eventDate: "2026-10-27",
		updatedAt: 2,
		canEdit: true,
		canReport: false,
	};
	const coach: SessionPerformanceEntry = {
		...entry,
		id: "coach",
		eventDate: "2026-10-27",
		updatedAt: 3,
	};
	const input = [entry, own, coach];
	const sorted = chronologicalSessionRatings(input);
	expect(sorted).toEqual([coach, own, entry]);
	expect(input).toEqual([entry, own, coach]);
	expect(sorted.at(0)).toBe(coach);
	expect(sorted.at(1)).toBe(own);
});
