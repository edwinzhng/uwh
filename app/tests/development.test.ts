import { expect, test } from "bun:test";
import type { Member } from "../src/domain/app-types";
import {
	assertDevelopmentReopen,
	assertDevelopmentVersion,
	type DevelopmentDraft,
	type DevelopmentRound,
	developmentPlayer,
	finalizedDevelopmentRating,
	nextDevelopmentReview,
	nextDevelopmentRound,
	requireDevelopmentCoach,
	validateDevelopmentDraft,
} from "../src/domain/development";
import { defaultPlayerCoaching } from "../src/domain/player-coaching";

const member: Member = {
	id: "player",
	name: "Player",
	programs: ["club"],
	position: "Forward",
	rating: 50,
	registration: "approved",
	goal: "Passing",
	steps: 2,
};
const profile = defaultPlayerCoaching(member);
const coaches = [
	{ id: "a", name: "Coach A" },
	{ id: "b", name: "Coach B" },
];
const round = nextDevelopmentRound(
	member.id,
	undefined,
	profile,
	coaches.map((coach) => coach.id),
	100,
);
const draft: DevelopmentDraft = {
	personId: member.id,
	round: 1,
	revision: 0,
	rating: 70,
	observation: "Good positioning",
	submit: false,
};

test("only coaches access private development review data", (): void => {
	expect(() => requireDevelopmentCoach({ coachPrograms: [] })).toThrow(
		"Coach access",
	);
	expect(() =>
		requireDevelopmentCoach({ coachPrograms: ["club"] }),
	).not.toThrow();
});

test("drafts are author-only and are excluded from aggregate observations and ratings", (): void => {
	const own = nextDevelopmentReview(round, undefined, "a", draft, 101);
	const author = developmentPlayer(member, profile, round, [own], coaches, "a");
	const other = developmentPlayer(member, profile, round, [own], coaches, "b");
	expect(author.ownReview?.observation).toBe(draft.observation);
	expect(other.ownReview).toBeUndefined();
	expect(other.average).toBeUndefined();
	expect(other.observations).toEqual([]);
	expect(other.submittedCount).toBe(0);
});

test("explicit finalization waits for one submitted rating from every snapshot coach", (): void => {
	const first = nextDevelopmentReview(
		round,
		undefined,
		"a",
		{ ...draft, submit: true },
		101,
	);
	const second = nextDevelopmentReview(
		round,
		undefined,
		"b",
		{ ...draft, rating: 90, submit: true },
		102,
	);
	const partial = developmentPlayer(
		member,
		profile,
		round,
		[first],
		coaches,
		"a",
	);
	expect(() => finalizedDevelopmentRating(partial)).toThrow(
		"Every required coach",
	);
	const duplicate = developmentPlayer(
		member,
		profile,
		round,
		[first, first],
		coaches,
		"a",
	);
	expect(duplicate.submittedCount).toBe(1);
	expect(duplicate.canFinalize).toBe(false);
	const complete = developmentPlayer(
		member,
		profile,
		round,
		[first, second],
		coaches,
		"a",
	);
	expect(complete.canFinalize).toBe(true);
	expect(finalizedDevelopmentRating(complete)).toBe(80);
});

test("saving as a draft withdraws a submitted review without deleting the coach's work", (): void => {
	const submitted = nextDevelopmentReview(
		round,
		undefined,
		"a",
		{ ...draft, submit: true },
		101,
	);
	const withdrawn = nextDevelopmentReview(
		round,
		submitted,
		"a",
		{ ...draft, revision: 1 },
		102,
	);
	const summary = developmentPlayer(
		member,
		profile,
		round,
		[withdrawn],
		coaches,
		"a",
	);
	expect(summary.submittedCount).toBe(0);
	expect(summary.ownReview?.rating).toBe(70);
	expect(summary.ownReview?.revision).toBe(2);
});

test("review validation rejects missing, non-finite, out-of-range and oversized submissions", (): void => {
	for (const rating of [
		undefined,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		0,
		101,
	]) {
		expect(
			validateDevelopmentDraft({ rating, observation: "", submit: true }),
		).toBeDefined();
	}
	expect(
		validateDevelopmentDraft({ observation: "", submit: false }),
	).toBeUndefined();
	expect(
		validateDevelopmentDraft({
			rating: 1,
			observation: "x".repeat(1001),
			submit: true,
		}),
	).toBeDefined();
	expect(
		validateDevelopmentDraft({ rating: 100, observation: "", submit: true }),
	).toBeUndefined();
});

test("stale author revisions, rounds and unlisted coaches cannot overwrite reviews", (): void => {
	const current = nextDevelopmentReview(round, undefined, "a", draft, 101);
	expect(() => nextDevelopmentReview(round, current, "a", draft, 102)).toThrow(
		"another session",
	);
	expect(() =>
		nextDevelopmentReview(round, undefined, "a", { ...draft, round: 2 }, 102),
	).toThrow("round changed");
	expect(() =>
		nextDevelopmentReview(
			round,
			undefined,
			"a",
			{ ...draft, personId: "other" },
			102,
		),
	).toThrow("round changed");
	expect(() =>
		nextDevelopmentReview(round, undefined, "outsider", draft, 102),
	).toThrow("roster changed");
	expect(() =>
		assertDevelopmentVersion(
			{ ...round, revision: 1 },
			{ personId: member.id, round: 1, revision: 0 },
		),
	).toThrow("round changed");
});

test("roster or authoritative profile changes require an explicit fresh round", (): void => {
	const first = nextDevelopmentReview(
		round,
		undefined,
		"a",
		{ ...draft, submit: true },
		101,
	);
	const second = nextDevelopmentReview(
		round,
		undefined,
		"b",
		{ ...draft, rating: 90, submit: true },
		102,
	);
	const changedRoster = developmentPlayer(
		member,
		profile,
		round,
		[first, second],
		[...coaches, { id: "c", name: "Coach C" }],
		"a",
	);
	expect(() => finalizedDevelopmentRating(changedRoster)).toThrow(
		"roster changed",
	);
	expect(() => assertDevelopmentReopen(changedRoster)).not.toThrow();
	const changedProfile = developmentPlayer(
		member,
		{ ...profile, revision: 1 },
		round,
		[first, second],
		coaches,
		"a",
	);
	expect(() => finalizedDevelopmentRating(changedProfile)).toThrow(
		"Player details changed",
	);
	expect(() => assertDevelopmentReopen(changedProfile)).not.toThrow();
	const finalized: DevelopmentRound = {
		...round,
		status: "finalized",
		finalizedRating: 80,
	};
	expect(() =>
		nextDevelopmentReview(
			finalized,
			first,
			"a",
			{ ...draft, revision: 1 },
			103,
		),
	).toThrow("closed");
	const reopened = nextDevelopmentRound(
		member.id,
		finalized,
		{ ...profile, revision: 1 },
		["a", "c"],
		104,
	);
	expect(reopened.round).toBe(2);
	expect(reopened.profileRevision).toBe(1);
	expect(reopened.requiredCoachIds).toEqual(["a", "c"]);
	expect(finalized.finalizedRating).toBe(80);
});
