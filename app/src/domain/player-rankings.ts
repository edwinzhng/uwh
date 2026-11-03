import type { CoachScore } from "./player-coaching";

export type PlayerRanking = {
	personId: string;
	name: string;
	scores: CoachScore[];
	coachCount: number;
	ownCoachId: string;
};
export const rankingComplete = (player: PlayerRanking): boolean =>
	player.coachCount > 0 && player.scores.length >= player.coachCount;
export const orderRankings = (
	players: readonly PlayerRanking[],
): PlayerRanking[] =>
	players
		.slice()
		.sort(
			(left, right) =>
				Number(rankingComplete(left)) - Number(rankingComplete(right)) ||
				Number(left.scores.some((score) => score.coachId === left.ownCoachId)) -
					Number(
						right.scores.some((score) => score.coachId === right.ownCoachId),
					) ||
				left.name.localeCompare(right.name),
		);
