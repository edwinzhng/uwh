import {
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import { previewResourceMemberMerge } from "../src/domain/resource-member-merge";
import { resourceTimestamps } from "../src/domain/resources";
import type { QueryCtx } from "./_generated/server";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";

export const planResourceMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule> => {
	const rows = await ctx.db
		.query("resources")
		.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
		.take(memberMergeLimits.rows + 1);
	const preview = previewResourceMemberMerge(
		rows.map((row) => ({ ...row, id: row._id })),
		input.source.id,
		input.target.id,
	);
	const conflicts = [
		...preview.conflicts,
		...(rows.length > memberMergeLimits.rows
			? [
					{
						category: "Resource review limit",
						record: "Resources library",
						reason: `More than ${memberMergeLimits.rows} resource records must be checked for person tags.`,
						resolution:
							"Review the resource library in smaller batches before merging these profiles.",
					},
				]
			: []),
	];
	return {
		counts: preview.counts,
		conflicts,
		fingerprint: memberMergeFingerprint([JSON.stringify(rows)]),
		apply: async (mutation): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve resource merge conflicts first.");
			for (const update of preview.updates) {
				const row = rows.find((resource) => resource._id === update.id);
				if (row)
					await mutation.db.patch(row._id, {
						personIds: update.personIds,
						revision: row.revision + 1,
						...resourceTimestamps(row, Date.now()),
					});
			}
		},
	};
};
