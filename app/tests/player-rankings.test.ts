import { expect, test } from "bun:test";
import { canAssignPracticeCoach } from "../src/domain/coaching-hours";
import {
	coachScoreAverage,
	validCoachScore,
} from "../src/domain/player-coaching";
import {
	nextRankingPlayer,
	orderRankings,
	type PlayerRanking,
	rankingComplete,
} from "../src/domain/player-rankings";
import { teamStrength } from "../src/domain/team-strength";

const player = (name: string, own: boolean, count: number): PlayerRanking => ({
	personId: name,
	name,
	ownCoachId: "me",
	coachCount: 2,
	scores: Array.from({ length: count }, (_, index) => ({
		coachId: own && index === 0 ? "me" : `other-${index}`,
		score: 40 + index * 20,
		revision: 1,
	})),
});
test("scoring queue puts incomplete players first and my unscored players ahead of my scored players", (): void => {
	const fully = player("A fully scored", true, 2);
	const own = player("B own saved", true, 1);
	const pending = player("C pending", false, 1);
	expect(
		orderRankings([fully, own, pending]).map((entry) => entry.personId),
	).toEqual([pending.personId, own.personId, fully.personId]);
	expect(rankingComplete(fully)).toBe(true);
	expect(rankingComplete(own)).toBe(false);
	expect(rankingComplete({ ...fully, scores: [], coachCount: 0 })).toBe(false);
});
test("zero is an intentional coach score, missing scores never become zero votes, and averages retain useful precision", (): void => {
	expect(validCoachScore("0")).toBe(true);
	expect(validCoachScore("100")).toBe(true);
	for (const value of ["", " ", "NaN", "Infinity", "-1", "101"])
		expect(validCoachScore(value)).toBe(false);
	expect(coachScoreAverage([])).toBeUndefined();
	expect(
		coachScoreAverage([
			{ coachId: "a", score: 0, revision: 1 },
			{ coachId: "b", score: 85, revision: 1 },
		]),
	).toBe(42.5);
});
test("team totals include substitutes, count a known zero, and disclose missing ratings", (): void => {
	expect(
		teamStrength(
			["starter", "substitute", "zero", "unknown", "missing", "starter"],
			[
				{ personId: "starter", rating: 80 },
				{ personId: "substitute", rating: 60 },
				{ personId: "zero", rating: 0, ratingKnown: true },
				{ personId: "unknown", rating: 0, ratingKnown: false },
			],
		),
	).toEqual({ total: 140, scored: 3, count: 5 });
});
test("three official coaches are allowed, a fourth is rejected, and existing coaches can still be edited", (): void => {
	const assignments = ["a", "b", "c"].map((coachId) => ({ coachId }));
	expect(canAssignPracticeCoach(assignments, "d")).toBe(false);
	expect(canAssignPracticeCoach(assignments, "b")).toBe(true);
	expect(canAssignPracticeCoach(assignments.slice(0, 2), "d")).toBe(true);
});

test("focused rating queue advances only past successful saves and current eligible players", (): void => {
	const pending = player("Pending", false, 0);
	const rated = player("Rated", true, 1);
	const queue = orderRankings([rated, pending]).map((entry) => entry.personId);
	expect(nextRankingPlayer([pending, rated], queue, [])?.personId).toBe(
		pending.personId,
	);
	expect(nextRankingPlayer([pending, rated], queue, [])?.personId).toBe(
		pending.personId,
	);
	expect(
		nextRankingPlayer([pending, rated], queue, [pending.personId])?.personId,
	).toBe(rated.personId);
	expect(nextRankingPlayer([rated], queue, [])?.personId).toBe(rated.personId);
	expect(
		nextRankingPlayer([pending, rated], queue, [
			pending.personId,
			rated.personId,
		]),
	).toBeUndefined();
	expect(
		nextRankingPlayer([player("New", false, 0)], queue, []),
	).toBeUndefined();
});
