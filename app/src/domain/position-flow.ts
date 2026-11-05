import type { PlayerRanking } from "./player-rankings";

export const positionFlowQueue = (
	players: readonly PlayerRanking[],
	initialPersonId?: string,
): string[] => [
	...(initialPersonId &&
	players.some((player) => player.personId === initialPersonId)
		? [initialPersonId]
		: []),
	...players
		.filter(
			(player) =>
				!player.positions?.length && player.personId !== initialPersonId,
		)
		.map((player) => player.personId),
];

import {
	type PlayerCoaching,
	type Position,
	validatePlayerCoaching,
} from "./player-coaching";

export const withPlayerPositions = (
	current: PlayerCoaching,
	positions: Position[],
	expectedRevision: number,
): PlayerCoaching => {
	if (current.revision !== expectedRevision)
		throw new Error("Player details changed. Reload before saving.");
	if (!positions.length) throw new Error("Choose at least one position.");
	const next = { ...current, positions };
	validatePlayerCoaching(next);
	return next;
};
