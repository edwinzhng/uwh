import { expect, test } from "bun:test";
import type { CoachingFeedback } from "../src/domain/app-types";
import {
	homeCoachNotes,
	homeFeedbackHighlight,
} from "../src/domain/home-feedback";
import type { SessionPerformanceEntry } from "../src/domain/session-performance";

const note = (extra: Partial<CoachingFeedback> = {}): CoachingFeedback => ({
	id: "note",
	personId: "player",
	authorId: "coach",
	body: "Keep your passing options open.",
	visibility: "published",
	date: "2026-11-01",
	...extra,
});

const rating = (
	extra: Partial<SessionPerformanceEntry> = {},
): SessionPerformanceEntry => ({
	id: "rating",
	personId: "player",
	eventId: "practice",
	eventTitle: "Monday practice",
	eventDate: "2026-10-26",
	programId: "club",
	kind: "coach",
	authorId: "coach",
	authorName: "Coach",
	rating: 7,
	comments: "Good support play.",
	revision: 1,
	updatedAt: 1,
	canEdit: false,
	canReport: true,
	...extra,
});

test("empty feedback produces no fabricated highlight", (): void => {
	expect(homeFeedbackHighlight([], [], "player")).toBeUndefined();
	expect(
		homeFeedbackHighlight([note({ body: "  " })], [], "player"),
	).toBeUndefined();
});

test("Home never promotes drafts, private notes, shoutouts or another player's feedback", (): void => {
	const notes = [
		note({ visibility: "draft" }),
		note({ visibility: "private" }),
		note({ kind: "shoutout" }),
		note({ personId: "another-player" }),
	];
	const ratings = [
		rating({ kind: "self" }),
		rating({ personId: "another-player" }),
		rating({ removed: true }),
	];
	expect(homeFeedbackHighlight(notes, ratings, "player")).toBeUndefined();
});

test("Home leads with the most recent coach content and preserves its full text", (): void => {
	const notes = [note({ date: "2026-10-25" }), note()];
	const newest = rating({ id: "newest", eventDate: "2026-11-02" });
	const ratings = [rating(), newest];
	expect(homeFeedbackHighlight(notes, ratings, "player")).toEqual({
		kind: "rating",
		entry: newest,
	});
	const longNote = note({ body: "A complete coaching note. ".repeat(30) });
	expect(homeFeedbackHighlight([longNote], [rating()], "player")).toEqual({
		kind: "note",
		entry: longNote,
	});
	expect(notes.at(0)?.date).toBe("2026-10-25");
	expect(ratings.at(0)?.id).toBe("rating");
});

test("Home keeps a same-day note readable and uses the latest revision among same-day ratings", (): void => {
	expect(
		homeFeedbackHighlight(
			[note()],
			[rating({ eventDate: "2026-11-01" })],
			"player",
		)?.kind,
	).toBe("note");
	expect(
		homeFeedbackHighlight(
			[],
			[rating(), rating({ id: "updated", updatedAt: 2 })],
			"player",
		)?.entry.id,
	).toBe("updated");
	expect(
		homeCoachNotes([note(), note({ kind: "coaching" })], "player"),
	).toHaveLength(2);
});
