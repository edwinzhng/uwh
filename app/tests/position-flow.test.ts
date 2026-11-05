import { expect, test } from "bun:test";
import type { PlayerCoaching } from "../src/domain/player-coaching";
import type { PlayerRanking } from "../src/domain/player-rankings";
import {
	positionFlowQueue,
	withPlayerPositions,
} from "../src/domain/position-flow";

const players: PlayerRanking[] = [
	{
		personId: "one",
		name: "One",
		positions: ["FORWARD"],
		scores: [],
		coachCount: 2,
		ownCoachId: "coach",
	},
	{
		personId: "two",
		name: "Two",
		positions: [],
		scores: [],
		coachCount: 2,
		ownCoachId: "coach",
	},
	{
		personId: "three",
		name: "Three",
		scores: [],
		coachCount: 2,
		ownCoachId: "coach",
	},
];
test("position queue includes only unassigned players unless a player is explicitly reopened", () => {
	expect(positionFlowQueue(players)).toEqual(["two", "three"]);
	expect(positionFlowQueue(players, "one")).toEqual(["one", "two", "three"]);
	expect(positionFlowQueue(players, "two")).toEqual(["two", "three"]);
});
const profile: PlayerCoaching = {
	personId: "one",
	positions: [],
	rating: 75,
	ratingKnown: true,
	scores: [{ coachId: "coach", score: 75, revision: 1 }],
	ageGroup: "adult",
	revision: 4,
};
test("one coach can assign multiple positions without changing ratings or demographics", () => {
	expect(withPlayerPositions(profile, ["FORWARD", "CENTER"], 4)).toEqual({
		...profile,
		positions: ["FORWARD", "CENTER"],
	});
	expect(profile.positions).toEqual([]);
});
test("position saves reject stale profiles and invalid empty or duplicate choices", () => {
	expect(() => withPlayerPositions(profile, ["WING"], 3)).toThrow(
		"Player details changed",
	);
	expect(() => withPlayerPositions(profile, [], 4)).toThrow(
		"Choose at least one position",
	);
	expect(() => withPlayerPositions(profile, ["WING", "WING"], 4)).toThrow(
		"Choose each position once",
	);
});
