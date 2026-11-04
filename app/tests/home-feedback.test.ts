import { expect, test } from "bun:test";
import type { CoachingFeedback } from "../src/domain/app-types";
import {
	homeCoachNotes,
	homeFeedbackHighlight,
} from "../src/domain/home-feedback";

const note = (extra: Partial<CoachingFeedback> = {}): CoachingFeedback => ({
	id: "note",
	personId: "player",
	authorId: "coach",
	body: "Keep your passing options open.",
	visibility: "published",
	date: "2026-11-01",
	...extra,
});

test("empty feedback produces no fabricated highlight", (): void => {
	expect(homeFeedbackHighlight([], "player")).toBeUndefined();
	expect(
		homeFeedbackHighlight([note({ body: "  " })], "player"),
	).toBeUndefined();
});

test("Home only promotes published coaching notes for the selected player", (): void => {
	expect(
		homeFeedbackHighlight(
			[
				note({ visibility: "draft" }),
				note({ visibility: "private" }),
				note({ kind: "shoutout" }),
				note({ personId: "another-player" }),
			],
			"player",
		),
	).toBeUndefined();
	const shared = note({ id: "shared" });
	expect(
		homeFeedbackHighlight(
			[note({ visibility: "private", date: "2026-11-02" }), shared],
			"player",
		),
	).toEqual({ kind: "note", entry: shared });
});

test("Home preserves full feedback and orders notes without mutating the input", (): void => {
	const notes = [
		note({ id: "old", date: "2026-10-25" }),
		note({ id: "latest", body: "A complete coaching note. ".repeat(30) }),
	];
	const latest = notes.at(1);
	if (!latest) throw new Error("Missing feedback fixture.");
	expect(homeFeedbackHighlight(notes, "player")).toEqual({
		kind: "note",
		entry: latest,
	});
	expect(notes.at(0)?.id).toBe("old");
	expect(
		homeCoachNotes([note(), note({ kind: "coaching" })], "player"),
	).toHaveLength(2);
});
