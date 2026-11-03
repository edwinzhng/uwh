import { expect, test } from "bun:test";
import type { PlayerRanking } from "../src/domain/player-rankings";
import {
	createRatingFlow,
	initialRatingDraft,
	previousRatingPosition,
	ratingDraftUnchanged,
	ratingFlowPosition,
	savedRatingDraft,
	updateRatingDraft,
} from "../src/domain/rating-flow";

const players: PlayerRanking[] = [
	{
		personId: "a",
		name: "Alpha",
		scores: [],
		coachCount: 1,
		ownCoachId: "coach",
	},
	{
		personId: "b",
		name: "Beta",
		scores: [],
		coachCount: 1,
		ownCoachId: "coach",
	},
];
test("back and continue preserve both the saved revision and next unsaved draft", (): void => {
	const initial = createRatingFlow(players);
	const first = savedRatingDraft(initial, "a", 0, {
		value: "70",
		revision: 1,
		savedValue: 70,
	});
	const secondDraft = updateRatingDraft(first, "b", {
		value: "45",
		revision: 0,
	});
	const back = {
		...secondDraft,
		cursor: previousRatingPosition(secondDraft, players) ?? 0,
	};
	expect(ratingFlowPosition(back, players)).toBe(0);
	expect(back.drafts.a).toEqual({ value: "70", revision: 1, savedValue: 70 });
	const forward = savedRatingDraft(back, "a", 0, {
		value: "72",
		revision: 2,
		savedValue: 72,
	});
	expect(ratingFlowPosition(forward, players)).toBe(1);
	expect(forward.drafts.b).toEqual({ value: "45", revision: 0 });
	expect(forward.savedIds).toEqual(["a"]);
});
test("completion permits going back without skipping the last revisited player", (): void => {
	const first = savedRatingDraft(createRatingFlow(players), "a", 0, {
		value: "70",
		revision: 1,
		savedValue: 70,
	});
	const completed = savedRatingDraft(first, "b", 1, {
		value: "40",
		revision: 1,
		savedValue: 40,
	});
	expect(ratingFlowPosition(completed, players)).toBe(2);
	expect(previousRatingPosition(completed, players)).toBe(1);
	const revisited = { ...completed, cursor: 1 };
	expect(ratingFlowPosition(revisited, players)).toBe(1);
	const finished = savedRatingDraft(revisited, "b", 1, {
		value: "40",
		revision: 1,
		savedValue: 40,
	});
	expect(finished.savedIds).toEqual(["a", "b"]);
	expect(ratingFlowPosition(finished, players)).toBe(2);
});
test("stable queues honor a valid deep link and skip removed players in either direction", (): void => {
	expect(createRatingFlow(players, "b").queue).toEqual(["b", "a"]);
	expect(createRatingFlow(players, "missing").queue).toEqual(["a", "b"]);
	const initial = createRatingFlow(players);
	expect(
		ratingFlowPosition(
			initial,
			players.filter((player) => player.personId === "b"),
		),
	).toBe(1);
	expect(
		previousRatingPosition(
			{ ...initial, cursor: 2 },
			players.filter((player) => player.personId === "a"),
		),
	).toBe(0);
	expect(previousRatingPosition(initial, players)).toBeUndefined();
});
test("unchanged saved values including zero advance without duplicate writes while edits retain optimistic revision", (): void => {
	const player = players.at(0);
	if (!player) throw new Error("Missing player.");
	expect(initialRatingDraft(player)).toEqual({
		value: "",
		revision: 0,
		savedValue: undefined,
	});
	expect(
		ratingDraftUnchanged(player, { value: "0", revision: 1, savedValue: 0 }),
	).toBe(true);
	expect(
		ratingDraftUnchanged(player, { value: "1", revision: 1, savedValue: 0 }),
	).toBe(false);
	expect(
		ratingDraftUnchanged(player, { value: "", revision: 1, savedValue: 0 }),
	).toBe(false);
	const updated = {
		...player,
		scores: [{ coachId: "coach", score: 70, revision: 3 }],
	};
	expect(
		ratingDraftUnchanged(updated, { value: "70", revision: 2, savedValue: 65 }),
	).toBe(true);
	expect(initialRatingDraft(updated)).toEqual({
		value: "70",
		revision: 3,
		savedValue: 70,
	});
});
