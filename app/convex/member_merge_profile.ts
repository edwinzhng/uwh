import {
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import { mergedProfileFields } from "../src/domain/profile-member-merge";
import type { QueryCtx } from "./_generated/server";
import { mergeScanConflicts } from "./member_merge_core";
import type {
	MemberMergeContext,
	MemberMergeModule,
} from "./member_merge_types";
import { profileRecord } from "./member_profiles";

export const planProfileMemberMerge = async (
	ctx: QueryCtx,
	input: MemberMergeContext,
): Promise<MemberMergeModule & { filledFields: string[] }> => {
	const [source, target, photos] = await Promise.all([
		profileRecord(ctx, input.clubId, input.source.id),
		profileRecord(ctx, input.clubId, input.target.id),
		ctx.db
			.query("memberProfilePhotos")
			.withIndex("by_club_person", (q) =>
				q.eq("clubId", input.clubId).eq("personId", input.source.id),
			)
			.take(memberMergeLimits.rows + 1),
	]);
	const next = mergedProfileFields(
		source ?? undefined,
		target ?? undefined,
		input.fillEmptyProfile,
	);
	const conflicts = mergeScanConflicts("Profile photos", photos);
	return {
		filledFields: next.filledFields,
		counts: [
			{ label: "Empty profile fields filled", count: next.filledFields.length },
			{
				label: "Prior profile details retained on alias",
				count: source ? 1 : 0,
			},
		],
		conflicts,
		fingerprint: memberMergeFingerprint([
			JSON.stringify({ source, target, photos }),
			String(input.fillEmptyProfile),
		]),
		apply: async (write): Promise<void> => {
			if (conflicts.length)
				throw new Error("Resolve profile merge conflicts first.");
			if (target || next.filledFields.length) {
				const photoId = next.fields.photoId
					? (write.db.normalizeId("memberProfilePhotos", next.fields.photoId) ??
						undefined)
					: undefined;
				const fields = { ...next.fields, photoId };
				const record = {
					clubId: input.clubId,
					personId: input.target.id,
					...fields,
					revision: (target?.revision ?? 0) + 1,
					lastKey: `merge:${input.source.id}`,
					lastActorId: undefined,
					lastPayload: JSON.stringify({ name: input.target.name, ...fields }),
					updatedAt: Date.now(),
				};
				if (target) await write.db.patch(target._id, record);
				else await write.db.insert("memberProfiles", record);
			}
			for (const photo of photos.filter((row) => !row.attached))
				await write.db.patch(photo._id, { personId: input.target.id });
		},
	};
};
