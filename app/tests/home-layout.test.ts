import { describe, expect, test } from "bun:test";
import {
	availableHomeCards,
	homeCardDropTarget,
	homeLayoutError,
	resolveHomeLayout,
} from "../src/domain/home-layout";

describe("home layouts", () => {
	test("keeps personal cards in the coaching view and gives admins club stats", () => {
		const coach = availableHomeCards(
			{ admin: false, coachPrograms: ["club"] },
			"coaching",
		);
		expect(coach).toContain("practice");
		expect(coach).toContain("fitness");
		expect(coach).toContain("next_coaching");
		expect(
			availableHomeCards({ admin: true, coachPrograms: [] }, "personal"),
		).toContain("club_stats");
		expect(
			availableHomeCards({ admin: false, coachPrograms: [] }, "personal"),
		).not.toContain("club_stats");
	});
	test("preserves order and hidden cards while adding newly available cards", () => {
		expect(
			resolveHomeLayout(["fitness", "shoutouts", "practice"], {
				order: ["shoutouts", "fitness"],
				hidden: ["fitness"],
				revision: 2,
			}),
		).toEqual({
			order: ["shoutouts", "fitness", "practice"],
			hidden: ["fitness"],
			revision: 2,
		});
	});
	test("rejects duplicates, unknown cards and hidden cards outside the layout", () => {
		expect(homeLayoutError(["fitness", "fitness"], [])).toBeDefined();
		expect(homeLayoutError(["unknown"], [])).toBeDefined();
		expect(homeLayoutError(["fitness"], ["practice"])).toBeDefined();
		expect(homeLayoutError(["fitness"], ["fitness"])).toBeUndefined();
	});

	test("reorders in both directions using the current order and variable card heights", () => {
		const heights = { practice: 180, announcement: 40, fitness: 90 };
		expect(
			homeCardDropTarget(
				["practice", "announcement", "fitness"],
				heights,
				"practice",
				120,
			),
		).toBe("announcement");
		expect(
			homeCardDropTarget(
				["announcement", "practice", "fitness"],
				heights,
				"practice",
				-120,
			),
		).toBe("announcement");
		expect(
			homeCardDropTarget(
				["announcement", "practice", "fitness"],
				heights,
				"practice",
				4,
			),
		).toBeUndefined();
	});
});
