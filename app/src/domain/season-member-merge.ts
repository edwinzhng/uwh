import { mergeCollision } from "./core-member-merge";
import type { MemberMergeConflict } from "./member-merge";
import { seasonRecordKey } from "./preview-season-ledger";
import type { SeasonRecord } from "./season-ledger";

export const emptyMemberSeason = (
	row: Pick<SeasonRecord, "registration" | "cuga" | "due" | "paid">,
): boolean =>
	row.registration === "missing" &&
	!row.cuga &&
	row.due === 0 &&
	row.paid === 0;
export const mergeSeasonHistory = <
	Entry extends { personId: string; seasonId: string },
>(
	records: Record<string, SeasonRecord>,
	history: readonly Entry[],
	sourceId: string,
	targetId: string,
): {
	records: Record<string, SeasonRecord>;
	history: Entry[];
	conflicts: MemberMergeConflict[];
	count: number;
} => {
	const source = Object.values(records).filter(
		(row) => row.personId === sourceId,
	);
	const conflicts = source
		.filter((row) => {
			const target = records[seasonRecordKey(targetId, row.seasonId)];
			return target && !emptyMemberSeason(row) && !emptyMemberSeason(target);
		})
		.map((row) =>
			mergeCollision(
				"Season records",
				row.seasonId,
				"Both profiles have non-empty registration or financial summaries for this season.",
				"Reconcile this season’s registration, dues and payment summaries before merging; original ledger entries are retained.",
			),
		);
	const retained = Object.fromEntries(
		Object.entries(records).filter(([, row]) => row.personId !== sourceId),
	);
	for (const row of source) {
		const key = seasonRecordKey(targetId, row.seasonId);
		const target = records[key];
		retained[key] = {
			...(target && !emptyMemberSeason(target) ? target : row),
			personId: targetId,
			revision: (target?.revision ?? row.revision) + 1,
		};
	}
	return {
		records: conflicts.length ? records : retained,
		history: conflicts.length
			? [...history]
			: history.map((row) =>
					row.personId === sourceId ? { ...row, personId: targetId } : row,
				),
		conflicts,
		count: source.length,
	};
};
