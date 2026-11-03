import { fitnessSummary } from "../src/domain/fitness-model";
import {
	type MemberMergeConflict,
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import { fitnessMemberMergeConflicts } from "../src/domain/session-member-merge";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";

type SummaryUpdate = {
	testId: Id<"fitnessTests">;
	seasonId: string;
	source?: Doc<"fitnessStats">;
	target?: Doc<"fitnessStats">;
	value?: { count: number; total: number; best: number };
};
const scanConflicts = (
	category: string,
	rows: readonly object[],
): MemberMergeConflict[] =>
	rows.length > memberMergeLimits.rows
		? [
				{
					category,
					record: "Member history",
					reason: "This history exceeds the safe interactive merge limit.",
					resolution:
						"Use a reviewed data migration for this history; no records have been changed.",
				},
			]
		: [];

export const planFitnessMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const [sourceResults, targetResults, sourceStats, targetStats] =
		await Promise.all([
			ctx.db
				.query("fitnessResults")
				.withIndex("by_club_person", (q) =>
					q.eq("clubId", input.clubId).eq("personId", input.source.id),
				)
				.take(memberMergeLimits.rows + 1),
			ctx.db
				.query("fitnessResults")
				.withIndex("by_club_person", (q) =>
					q.eq("clubId", input.clubId).eq("personId", input.target.id),
				)
				.take(memberMergeLimits.rows + 1),
			ctx.db
				.query("fitnessStats")
				.withIndex("by_club_person", (q) =>
					q.eq("clubId", input.clubId).eq("personId", input.source.id),
				)
				.take(memberMergeLimits.rows + 1),
			ctx.db
				.query("fitnessStats")
				.withIndex("by_club_person", (q) =>
					q.eq("clubId", input.clubId).eq("personId", input.target.id),
				)
				.take(memberMergeLimits.rows + 1),
		]);
	const groups = [
		...new Map(
			[...sourceResults, ...sourceStats].map((row) => [
				JSON.stringify([row.testId, row.seasonId]),
				{ testId: row.testId, seasonId: row.seasonId },
			]),
		).values(),
	];
	const [sessions, tests] = await Promise.all([
		Promise.all(
			[...new Set(sourceResults.map((row) => row.sessionId))].map((id) =>
				ctx.db.get(id),
			),
		),
		Promise.all(
			[...new Set(groups.map((group) => group.testId))].map((id) =>
				ctx.db.get(id),
			),
		),
	]);
	const conflicts: MemberMergeConflict[] = [
		...scanConflicts("Fitness results", sourceResults),
		...scanConflicts("Fitness results", targetResults),
		...scanConflicts("Fitness summaries", sourceStats),
		...scanConflicts("Fitness summaries", targetStats),
		...fitnessMemberMergeConflicts(
			[...sourceResults, ...targetResults],
			input.source.id,
			input.target.id,
		),
		...(sessions.some((row) => !row || row.clubId !== input.clubId) ||
		tests.some((row) => !row || row.clubId !== input.clubId)
			? [
					{
						category: "Fitness history",
						record: "Linked test or session",
						reason: "A result references an unavailable test or session.",
						resolution:
							"Repair the original fitness relationship before merging.",
					},
				]
			: []),
	];
	const summaries: SummaryUpdate[] = groups.map((group) => {
		const test = tests.find((row) => row?._id === group.testId);
		const summary = test
			? fitnessSummary(
					test.unit,
					[...sourceResults, ...targetResults].filter(
						(row) =>
							row.testId === group.testId && row.seasonId === group.seasonId,
					),
				)
			: undefined;
		return {
			...group,
			source: sourceStats.find(
				(row) => row.testId === group.testId && row.seasonId === group.seasonId,
			),
			target: targetStats.find(
				(row) => row.testId === group.testId && row.seasonId === group.seasonId,
			),
			value:
				summary?.best !== undefined
					? { ...summary, best: summary.best }
					: undefined,
		};
	});
	return {
		counts: [
			{ label: "Fitness results relinked", count: sourceResults.length },
			{ label: "Fitness sessions refreshed", count: sessions.length },
			{ label: "Fitness summaries rebuilt", count: summaries.length },
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify(sourceResults),
			JSON.stringify(targetResults),
			JSON.stringify(sourceStats),
			JSON.stringify(targetStats),
			JSON.stringify(sessions),
			JSON.stringify(tests),
		]),
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve fitness conflicts before merging.");
			for (const row of sourceResults)
				await write.db.patch(row._id, { personId: input.target.id });
			for (const session of sessions) {
				if (session)
					await write.db.patch(session._id, { revision: session.revision + 1 });
			}
			for (const summary of summaries) {
				const surviving = summary.target ?? summary.source;
				if (summary.value) {
					const value = {
						clubId: input.clubId,
						testId: summary.testId,
						seasonId: summary.seasonId,
						personId: input.target.id,
						...summary.value,
					};
					if (surviving) await write.db.patch(surviving._id, value);
					else await write.db.insert("fitnessStats", value);
				} else if (surviving) await write.db.delete(surviving._id);
				if (summary.source && summary.target)
					await write.db.delete(summary.source._id);
			}
		},
	};
};
