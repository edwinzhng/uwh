import {
	type MemberMergeConflict,
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import {
	completedLineupEvent,
	lineupMemberIds,
	lineupMemberMergeConflicts,
	relinkLineupMember,
	relinkSeriesMember,
	seriesMemberMergeConflicts,
	sessionCheckinMergeConflicts,
} from "../src/domain/session-member-merge";
import type { QueryCtx } from "./_generated/server";
import { planFitnessMemberMerge } from "./fitness_member_merge";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";
import { planPerformanceMemberMerge } from "./performance_member_merge";

const scanConflicts = (
	category: string,
	rows: readonly object[],
): MemberMergeConflict[] =>
	rows.length > memberMergeLimits.rows
		? [
				{
					category,
					record: "Club history",
					reason: "This history exceeds the safe interactive merge limit.",
					resolution:
						"Use a reviewed data migration for this history; no records have been changed.",
				},
			]
		: [];

export const planSessionMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const [
		lineups,
		series,
		sourceCheckins,
		targetCheckins,
		fitness,
		performance,
	] = await Promise.all([
		ctx.db
			.query("teams")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("sessionSeries")
			.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("sessionCheckins")
			.withIndex("by_person", (q) =>
				q.eq("clubId", input.clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("sessionCheckins")
			.withIndex("by_person", (q) =>
				q.eq("clubId", input.clubId).eq("personId", input.target.id),
			)
			.take(memberMergeLimits.rows + 1),
		planFitnessMemberMerge(ctx, input),
		planPerformanceMemberMerge(ctx, input),
	]);
	const affectedLineups = lineups.filter((row) =>
		lineupMemberIds(row.value).includes(input.source.id),
	);
	const events = await Promise.all(
		[...new Set(affectedLineups.map((row) => row.value.eventId))].map(
			(eventId) =>
				ctx.db
					.query("events")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", input.clubId).eq("value.id", eventId),
					)
					.unique(),
		),
	);
	const now = Date.now();
	const completed = new Set(
		events
			.filter((row) => completedLineupEvent(row?.value, now))
			.flatMap((row) => (row ? [row.value.id] : [])),
	);
	const affectedSeries = series.filter((row) =>
		row.enrollments.some((entry) => entry.personId === input.source.id),
	);
	const conflicts = [
		...scanConflicts("Lineups", lineups),
		...scanConflicts("Committed rosters", series),
		...scanConflicts("Private energy check-ins", sourceCheckins),
		...scanConflicts("Private energy check-ins", targetCheckins),
		...lineupMemberMergeConflicts(
			affectedLineups.map((row) => row.value),
			input.source.id,
			input.target.id,
		),
		...seriesMemberMergeConflicts(
			affectedSeries,
			input.source.id,
			input.target.id,
		),
		...sessionCheckinMergeConflicts(
			[...sourceCheckins, ...targetCheckins],
			input.source.id,
			input.target.id,
		),
		...fitness.conflicts,
		...performance.conflicts,
	];
	return {
		counts: [
			{
				label: "Lineups relinked and unpublished",
				count: affectedLineups.filter(
					(row) => !completed.has(row.value.eventId),
				).length,
			},
			{
				label: "Completed lineups relinked with publication preserved",
				count: affectedLineups.filter((row) => completed.has(row.value.eventId))
					.length,
			},
			{
				label: "Private energy check-ins relinked",
				count: sourceCheckins.length,
			},
			{
				label: "Committed roster enrollments relinked",
				count: affectedSeries.reduce(
					(count, row) =>
						count +
						row.enrollments.filter(
							(entry) => entry.personId === input.source.id,
						).length,
					0,
				),
			},
			...fitness.counts,
			...performance.counts,
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify(lineups),
			JSON.stringify(series),
			JSON.stringify(sourceCheckins),
			JSON.stringify(targetCheckins),
			JSON.stringify(events),
			JSON.stringify([...completed].toSorted()),
			fitness.fingerprint,
			performance.fingerprint,
		]),
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve session conflicts before merging.");
			for (const row of affectedLineups)
				await write.db.patch(row._id, {
					value: {
						...row.value,
						...relinkLineupMember(
							row.value,
							input.source.id,
							input.target.id,
							completed.has(row.value.eventId),
						),
					},
				});
			for (const row of affectedSeries)
				await write.db.patch(row._id, {
					enrollments: relinkSeriesMember(row, input.source.id, input.target.id)
						.enrollments,
				});
			for (const row of sourceCheckins)
				await write.db.patch(row._id, { personId: input.target.id });
			await fitness.apply(write);
			await performance.apply(write);
		},
	};
};
