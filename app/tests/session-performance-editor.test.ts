import { expect, test } from "bun:test";
import { sessionPerformanceDraft } from "../src/domain/session-performance-draft";

test("session drafts preserve unsaved edits for the same subject, session and author kind", (): void => {
	const draft = {
		...sessionPerformanceDraft(undefined, "player-a", "session-a", "coach"),
		rating: "8",
		comments: "Keep these edits after a failed save.",
		revision: 3,
	};
	expect(sessionPerformanceDraft(draft, "player-a", "session-a", "coach")).toBe(
		draft,
	);
	for (const [person, event, kind] of [
		["player-b", "session-a", "coach"],
		["player-a", "session-b", "coach"],
		["player-a", "session-a", "self"],
	] as const) {
		const next = sessionPerformanceDraft(draft, person, event, kind);
		expect(next.rating).toBeUndefined();
		expect(next.comments).toBe("");
		expect(next.revision).toBe(0);
	}
});
