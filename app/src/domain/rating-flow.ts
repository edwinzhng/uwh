import { orderRankings, type PlayerRanking } from "./player-rankings";

export type RatingDraft = {
	value: string;
	revision: number;
	savedValue?: number;
};
export type RatingFlowState = {
	queue: string[];
	cursor: number;
	drafts: Record<string, RatingDraft>;
	savedIds: string[];
};
export const initialRatingDraft = (player: PlayerRanking): RatingDraft => {
	const own = player.scores.find(
		(score) => score.coachId === player.ownCoachId,
	);
	return {
		value: own ? String(own.score) : "",
		revision: own?.revision ?? 0,
		savedValue: own?.score,
	};
};
export const createRatingFlow = (
	players: readonly PlayerRanking[],
	initialPersonId?: string,
): RatingFlowState => ({
	queue: [
		...(initialPersonId &&
		players.some((player) => player.personId === initialPersonId)
			? [initialPersonId]
			: []),
		...orderRankings(players)
			.filter((player) => player.personId !== initialPersonId)
			.map((player) => player.personId),
	],
	cursor: 0,
	drafts: {},
	savedIds: [],
});
export const ratingFlowPosition = (
	state: RatingFlowState,
	players: readonly PlayerRanking[],
): number => {
	const index = state.queue.findIndex(
		(id, index) =>
			index >= state.cursor && players.some((player) => player.personId === id),
	);
	return index < 0 ? state.queue.length : index;
};
export const previousRatingPosition = (
	state: RatingFlowState,
	players: readonly PlayerRanking[],
): number | undefined => {
	const position = ratingFlowPosition(state, players);
	return state.queue
		.flatMap((id, index) =>
			index < position && players.some((player) => player.personId === id)
				? [index]
				: [],
		)
		.at(-1);
};
export const updateRatingDraft = (
	state: RatingFlowState,
	personId: string,
	draft: RatingDraft,
): RatingFlowState => ({
	...state,
	drafts: { ...state.drafts, [personId]: draft },
});
export const savedRatingDraft = (
	state: RatingFlowState,
	personId: string,
	position: number,
	draft: RatingDraft,
): RatingFlowState => ({
	...updateRatingDraft(state, personId, draft),
	cursor: position + 1,
	savedIds: [...new Set([...state.savedIds, personId])],
});

export const ratingDraftUnchanged = (
	player: PlayerRanking,
	draft: RatingDraft,
): boolean => {
	const own = player.scores.find(
		(score) => score.coachId === player.ownCoachId,
	);
	return (
		Boolean(draft.value.trim()) &&
		(Number(draft.value) === draft.savedValue ||
			(own !== undefined &&
				own.revision >= draft.revision &&
				Number(draft.value) === own.score))
	);
};
