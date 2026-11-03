import {
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import { performanceMemberMergeConflicts } from "../src/domain/session-performance";
import type { QueryCtx } from "./_generated/server";
import { mergeScanConflicts } from "./member_merge_core";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";

export const planPerformanceMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const [source, target, requests, reports] = await Promise.all([
		ctx.db
			.query("sessionPerformance")
			.withIndex("by_person", (q) =>
				q.eq("clubId", input.clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("sessionPerformance")
			.withIndex("by_person", (q) =>
				q.eq("clubId", input.clubId).eq("personId", input.target.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("sessionPerformanceRequests")
			.withIndex("by_person", (q) =>
				q.eq("clubId", input.clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
		ctx.db
			.query("chatReports")
			.withIndex("by_source_person", (q) =>
				q.eq("clubId", input.clubId).eq("source.personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
	]);
	const conflicts = [
		...[source, target, requests, reports].flatMap((rows) =>
			mergeScanConflicts("Session performance", rows),
		),
		...performanceMemberMergeConflicts(
			[...source, ...target],
			input.source.id,
			input.target.id,
		),
	];
	return {
		counts: [
			{ label: "Session performance ratings relinked", count: source.length },
			{
				label: "Session-rating operation receipts relinked",
				count: requests.length,
			},
			{ label: "Session feedback reports relinked", count: reports.length },
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify(source),
			JSON.stringify(target),
			JSON.stringify(requests),
			JSON.stringify(reports),
		]),
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve session-rating collisions before merging.");
			for (const row of source)
				await write.db.patch(row._id, {
					personId: input.target.id,
					revision: row.revision + 1,
				});
			for (const row of requests)
				await write.db.patch(row._id, { personId: input.target.id });
			for (const row of reports)
				if (row.source)
					await write.db.patch(row._id, {
						source: { ...row.source, personId: input.target.id },
					});
		},
	};
};
