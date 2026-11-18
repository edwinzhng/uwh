import { describe, expect, test } from "bun:test";
import { countdownLabel, upcomingCountdowns } from "../src/domain/countdown";
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
	test("preserves order and hidden cards while slotting in newly available cards", () => {
		expect(
			resolveHomeLayout(["fitness", "shoutouts", "practice"], {
				order: ["shoutouts", "fitness"],
				hidden: ["fitness"],
				revision: 2,
			}),
		).toEqual({
			order: ["shoutouts", "practice", "fitness"],
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

test("countdown lists the next tagged events with days to go", (): void => {
	const event = {
		start: "09:00",
		end: "10:00",
		venue: "Pool",
		program: "club",
		kind: "tournament",
		signup: "open",
		description: "",
		cancelled: false,
	} as const;
	const countdowns = upcomingCountdowns(
		[
			{
				...event,
				id: "worlds",
				title: "Worlds",
				date: "2027-07-01",
				countdown: true,
			},
			{
				...event,
				id: "agm",
				title: "AGM",
				date: "2026-11-11",
				countdown: true,
			},
			{ ...event, id: "practice", title: "Practice", date: "2026-11-12" },
			{
				...event,
				id: "gone",
				title: "Old",
				date: "2026-11-01",
				countdown: true,
			},
			{
				...event,
				id: "camp",
				title: "Camp",
				date: "2026-11-09",
				endDate: "2026-11-11",
				countdown: true,
			},
		],
		"2026-11-10",
	);
	expect(
		countdowns.map((entry) => [entry.event.id, countdownLabel(entry)]),
	).toEqual([
		["camp", "Happening now"],
		["agm", "Tomorrow"],
		["worlds", "233 days"],
	]);
});

test("new home cards slot in next to their neighbours in saved layouts", (): void => {
	expect(
		resolveHomeLayout(["practice", "countdown", "announcement", "season"], {
			order: ["season", "practice", "announcement"],
			hidden: [],
			revision: 2,
		}).order,
	).toEqual(["season", "practice", "countdown", "announcement"]);
});
