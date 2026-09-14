import { expect, test } from "bun:test";
import { players } from "../src/demo/data";
import { generatePreviewTeams } from "../src/domain/club";

test("teams include each available attendee once, balance sizes, and are deterministic", (): void => {
	const roster = players.map((player) =>
		player.id === "sam" ? { ...player, attendance: "absent" as const } : player,
	);
	const teams = generatePreviewTeams(roster);
	const ids = [...teams.black, ...teams.white].map((player) => player.id);
	expect(new Set(ids).size).toBe(ids.length);
	expect(ids.toSorted()).toEqual(["alex", "casey", "jordan", "robin"]);
	expect(Math.abs(teams.black.length - teams.white.length)).toBeLessThanOrEqual(
		1,
	);
	expect(generatePreviewTeams(roster.toReversed())).toEqual(teams);
	expect(generatePreviewTeams([])).toEqual({ black: [], white: [] });
});
