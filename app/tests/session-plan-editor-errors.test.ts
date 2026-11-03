import { expect, test } from "bun:test";
import {
	emptySessionPlan,
	normalizeSessionPlan,
	validateSessionPlan,
} from "../src/domain/session-plan";

test("invalid attachment validation preserves the freeform draft for correction and retry", (): void => {
	const draft = {
		...emptySessionPlan(),
		body: "**Practice**\nWarm up and play.",
		notes: "Private coaching note",
		revision: 7,
		media: [
			{
				id: "clip",
				source: "link" as const,
				label: "",
				url: "https://youtu.be/dQw4w9WgXcQ",
			},
		],
	};
	expect(validateSessionPlan(draft)).toContain("attachment name");
	const corrected = {
		...draft,
		media: draft.media.map((media) => ({ ...media, label: "Passing example" })),
	};
	expect(validateSessionPlan(corrected)).toBeUndefined();
	expect(corrected.body).toBe(draft.body);
	expect(corrected.notes).toBe(draft.notes);
	expect(corrected.revision).toBe(7);
	expect(draft.media.at(0)?.label).toBe("");
	expect(normalizeSessionPlan(corrected).media).toHaveLength(1);
});
