import { expect, test } from "bun:test";
import type { TeamPlan } from "../src/domain/app-types";
import { lineupVisibleSides } from "../src/domain/lineup-visible-sides";

const plan: TeamPlan = {
	eventId: "practice",
	black: ["black-player"],
	white: ["white-player"],
	blackBench: ["black-sub"],
	whiteBench: ["white-sub"],
	attendees: [],
	published: true,
};
test("coaches can see both teams and players see their assigned side including reserves", (): void => {
	expect(lineupVisibleSides(plan)).toEqual(["black", "white"]);
	expect(lineupVisibleSides(plan, "black-player")).toEqual(["black"]);
	expect(lineupVisibleSides(plan, "black-sub")).toEqual(["black"]);
	expect(lineupVisibleSides(plan, "white-player")).toEqual(["white"]);
	expect(lineupVisibleSides(plan, "white-sub")).toEqual(["white"]);
	expect(lineupVisibleSides(plan, "unassigned")).toEqual([]);
});
