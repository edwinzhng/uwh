import { expect, test } from "bun:test";
import { rankFitnessResults } from "../src/domain/fitness-ranking";

test("fitness rankings compare each player's best and give tied results the same rank", (): void => {
	const results = [
		{ personId: "a", value: 32 },
		{ personId: "a", value: 29 },
		{ personId: "b", value: 29 },
		{ personId: "c", value: 31 },
	];
	expect(rankFitnessResults({ unit: "time" }, results)).toEqual([
		{ personId: "a", value: 29, rank: 1 },
		{ personId: "b", value: 29, rank: 1 },
		{ personId: "c", value: 31, rank: 3 },
	]);
	expect(rankFitnessResults({ unit: "count" }, results).at(0)).toEqual({
		personId: "a",
		value: 32,
		rank: 1,
	});
	expect(rankFitnessResults({ unit: "pass_fail" }, results)).toEqual([]);
});
