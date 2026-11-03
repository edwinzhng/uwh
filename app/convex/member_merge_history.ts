import { mergeCollision } from "../src/domain/core-member-merge";
import { mergeDevelopmentHistory } from "../src/domain/development-member-merge";
import {
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import type { QueryCtx } from "./_generated/server";
import { mergeScanConflicts } from "./member_merge_core";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";

const emptySeason = (row: {
	registration: string;
	cuga: boolean;
	due: number;
	paid: number;
}): boolean =>
	row.registration === "missing" &&
	!row.cuga &&
	row.due === 0 &&
	row.paid === 0;

export const planHistoryMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const clubId = input.clubId;
	const [
		records,
		ledger,
		references,
		hours,
		reflections,
		rounds,
		reviews,
		coaching,
	] = await Promise.all([
		Promise.all(
			[input.source.id, input.target.id].map((personId) =>
				ctx.db
					.query("seasonRecords")
					.withIndex("by_club_person", (q) =>
						q.eq("clubId", clubId).eq("personId", personId),
					)
					.take(memberMergeLimits.rows + 1),
			),
		).then((rows) => rows.flat()),
		ctx.db
			.query("seasonLedger")
			.withIndex("by_club_person", (q) =>
				q.eq("clubId", clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("importReferences")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("coachingHours")
			.withIndex("by_club_person", (q) =>
				q.eq("clubId", clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("goalReflections")
			.withIndex("by_club_person_date", (q) =>
				q.eq("clubId", clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		Promise.all(
			[input.source.id, input.target.id].map((personId) =>
				ctx.db
					.query("developmentRounds")
					.withIndex("by_club_person_round", (q) =>
						q.eq("clubId", clubId).eq("personId", personId),
					)
					.take(memberMergeLimits.rows + 1),
			),
		).then((rows) => rows.flat()),
		Promise.all(
			[input.source.id, input.target.id].map((personId) =>
				ctx.db
					.query("developmentReviews")
					.withIndex("by_club_person_round", (q) =>
						q.eq("clubId", clubId).eq("personId", personId),
					)
					.take(memberMergeLimits.rows + 1),
			),
		).then((rows) => rows.flat()),
		ctx.db
			.query("playerCoaching")
			.withIndex("by_club_person", (q) =>
				q.eq("clubId", clubId).eq("personId", input.source.id),
			)
			.unique(),
	]);
	const sourceRecords = records.filter(
		(row) => row.personId === input.source.id,
	);
	const affectedReferences = references.filter(
		(row) =>
			row.personId === input.source.id ||
			(row.kind === "members" && row.targetId === input.source.id),
	);
	const conflicts = [
		...[
			records,
			ledger,
			references,
			hours,
			reflections,
			rounds,
			reviews,
		].flatMap((rows) =>
			mergeScanConflicts("Development and membership history", rows),
		),
		...sourceRecords
			.filter((row) => {
				const target = records.find(
					(other) =>
						other.personId === input.target.id &&
						other.seasonId === row.seasonId,
				);
				return target && !emptySeason(row) && !emptySeason(target);
			})
			.map((row) =>
				mergeCollision(
					"Season records",
					row.seasonId,
					"Both profiles have non-empty registration or financial summaries for this season.",
					"Review registration, dues and payments for this season and reconcile one record to an empty summary before merging. Original ledger entries remain unchanged.",
				),
			),
		...reviews
			.filter(
				(review) =>
					!rounds.some(
						(round) =>
							round.personId === review.personId &&
							round.round === review.round,
					),
			)
			.map((row) =>
				mergeCollision(
					"Player reviews",
					`Round ${row.round}`,
					"A coach review has no matching review round.",
					"Repair the review history before merging.",
				),
			),
	];
	const development = mergeDevelopmentHistory(
		rounds,
		reviews,
		input.source.id,
		input.target.id,
	);
	return {
		counts: [
			{
				label: "Season registration summaries relinked",
				count: sourceRecords.length,
			},
			{ label: "Financial ledger entries relinked", count: ledger.length },
			{
				label: "Import source references relinked",
				count: affectedReferences.length,
			},
			{ label: "Coaching-hours records relinked", count: hours.length },
			{ label: "Goal reflections relinked", count: reflections.length },
			{
				label: "Player review rounds preserved and renumbered",
				count: rounds.some((row) => row.personId === input.source.id)
					? development.rounds.length
					: 0,
			},
			{
				label: "Coach review history relinked",
				count: reviews.filter((row) => row.personId === input.source.id).length,
			},
			{
				label: "Prior coaching metadata retained on alias",
				count: coaching ? 1 : 0,
			},
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify({
				records,
				ledger,
				references,
				hours,
				reflections,
				rounds,
				reviews,
				coaching,
			}),
		]),
		preserved: [
			{
				category: "Prior season summaries and coaching metadata",
				records: JSON.stringify({ records, coaching }),
			},
		],
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error(
					"Resolve development and season history conflicts first.",
				);
			for (const row of sourceRecords) {
				const target = records.find(
					(other) =>
						other.personId === input.target.id &&
						other.seasonId === row.seasonId,
				);
				if (target) {
					if (emptySeason(target))
						await write.db.patch(target._id, {
							registration: row.registration,
							cuga: row.cuga,
							due: row.due,
							paid: row.paid,
							revision: target.revision + 1,
						});
					else
						await write.db.patch(target._id, { revision: target.revision + 1 });
					await write.db.delete(row._id);
				} else
					await write.db.patch(row._id, {
						personId: input.target.id,
						revision: row.revision + 1,
					});
			}
			for (const row of ledger)
				await write.db.patch(row._id, { personId: input.target.id });
			for (const row of affectedReferences) {
				const targetId =
					row.kind === "members" && row.targetId === input.source.id
						? input.target.id
						: row.kind === "registration" &&
								row.personId === input.source.id &&
								row.seasonId
							? `${row.seasonId}:${input.target.id}`
							: row.kind === "attendance" &&
									row.personId === input.source.id &&
									row.targetId.endsWith(`:${input.source.id}`)
								? `${row.targetId.slice(0, -input.source.id.length)}${input.target.id}`
								: row.targetId;
				await write.db.patch(row._id, { personId: input.target.id, targetId });
			}
			for (const row of hours)
				await write.db.patch(row._id, { personId: input.target.id });
			for (const row of reflections)
				await write.db.patch(row._id, { personId: input.target.id });
			if (rounds.some((row) => row.personId === input.source.id)) {
				for (const row of development.rounds)
					await write.db.patch(row._id, {
						personId: row.personId,
						round: row.round,
						originPersonId: row.originPersonId,
						originRound: row.originRound,
						status: row.status,
						revision: row.revision,
					});
				for (const row of development.reviews)
					await write.db.patch(row._id, {
						personId: row.personId,
						round: row.round,
						originPersonId: row.originPersonId,
						originRound: row.originRound,
						revision: row.revision,
					});
			}
		},
	};
};
