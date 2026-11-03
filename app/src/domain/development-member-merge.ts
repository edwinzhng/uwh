import type { DevelopmentReview, DevelopmentRound } from "./development";

export const mergeDevelopmentHistory = <
	Round extends DevelopmentRound,
	Review extends DevelopmentReview,
>(
	rounds: readonly Round[],
	reviews: readonly Review[],
	sourceId: string,
	targetId: string,
): { rounds: Round[]; reviews: Review[] } => {
	const source = rounds
		.filter((row) => row.personId === sourceId)
		.slice()
		.sort((a, b) => a.round - b.round);
	if (!source.length) return { rounds: [...rounds], reviews: [...reviews] };
	const ordered = [
		...source,
		...rounds
			.filter((row) => row.personId === targetId)
			.slice()
			.sort((a, b) => a.round - b.round),
	];
	const mappings = ordered.map((row, index) => ({
		personId: row.personId,
		round: row.round,
		next: index + 1,
	}));
	return {
		rounds: rounds.map((row) => {
			const mapping = mappings.find(
				(entry) => entry.personId === row.personId && entry.round === row.round,
			);
			return mapping
				? {
						...row,
						personId: targetId,
						round: mapping.next,
						originPersonId: row.originPersonId ?? row.personId,
						originRound: row.originRound ?? row.round,
						revision: row.revision + 1,
						status:
							row.personId === sourceId && row.status === "open"
								? "superseded"
								: row.status,
					}
				: row;
		}),
		reviews: reviews.map((row) => {
			const mapping = mappings.find(
				(entry) => entry.personId === row.personId && entry.round === row.round,
			);
			return mapping
				? {
						...row,
						personId: targetId,
						round: mapping.next,
						originPersonId: row.originPersonId ?? row.personId,
						originRound: row.originRound ?? row.round,
						revision: row.revision + 1,
					}
				: row;
		}),
	};
};
