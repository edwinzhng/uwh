import { ConvexError, v } from "convex/values";
import { mergeCollision } from "../src/domain/core-member-merge";
import {
	type MemberMergePreview,
	memberMergeFingerprint,
	memberMergeLimits,
} from "../src/domain/member-merge";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireMember } from "./identity";
import { planCoreMemberMerge } from "./member_merge_core";
import { planHistoryMemberMerge } from "./member_merge_history";
import { planIdentityMemberMerge } from "./member_merge_identity";
import { planProfileMemberMerge } from "./member_merge_profile";
import type { MemberMergeModule } from "./member_merge_types";
import { profilePerson } from "./member_profiles";
import { planResourceMemberMerge } from "./resources_member_merge";
import { planSessionMemberMerge } from "./session_member_merge";

const pairArgs = {
	sourceId: v.string(),
	targetId: v.string(),
	fillEmptyProfile: v.boolean(),
};
const requireAdmin = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.admin) throw new ConvexError("Administrator access required.");
	return actor;
};
const mergePlan = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	input: { sourceId: string; targetId: string; fillEmptyProfile: boolean },
): Promise<{
	preview: MemberMergePreview;
	modules: MemberMergeModule[];
	source: Doc<"members">;
	target: Doc<"members">;
}> => {
	const [source, target] = await Promise.all([
		profilePerson(ctx, actor.clubId, input.sourceId),
		profilePerson(ctx, actor.clubId, input.targetId),
	]);
	if (
		source.value.id === target.value.id ||
		!source.value.archived ||
		source.value.mergedInto ||
		target.value.archived ||
		target.value.mergedInto
	)
		throw new ConvexError(
			"Choose an unmerged archived source and a different active target.",
		);
	const context = {
		source: source.value,
		target: target.value,
		clubId: actor.clubId,
		fillEmptyProfile: input.fillEmptyProfile,
	};
	const [core, identity, history, profile, resources, sessions] =
		await Promise.all([
			planCoreMemberMerge(ctx, context),
			planIdentityMemberMerge(ctx, context),
			planHistoryMemberMerge(ctx, context),
			planProfileMemberMerge(ctx, context),
			planResourceMemberMerge(ctx, context),
			planSessionMemberMerge(ctx, context),
		]);
	const modules = [core, identity, history, profile, resources, sessions];
	const counts = modules
		.flatMap((module) => module.counts)
		.filter((row) => row.count > 0);
	const conflicts = modules.flatMap((module) => module.conflicts);
	if (
		counts.reduce((sum, row) => sum + row.count, 0) > memberMergeLimits.changes
	)
		conflicts.push(
			mergeCollision(
				"Merge size",
				"Combined history",
				"This merge exceeds the safe interactive transaction size.",
				"Use a reviewed migration in smaller batches; no records have changed.",
			),
		);
	const preservedBytes = modules.reduce(
		(sum, module) =>
			sum +
			(module.preserved ?? []).reduce(
				(size, record) =>
					size + new TextEncoder().encode(record.records).length,
				0,
			),
		0,
	);
	if (preservedBytes > 500_000)
		conflicts.push(
			mergeCollision(
				"Merge audit",
				"Historical summaries",
				"The original summary snapshots exceed the safe audit size.",
				"Use a reviewed migration that preserves these snapshots outside this interactive transaction.",
			),
		);
	return {
		source,
		target,
		modules,
		preview: {
			source: { id: source.value.id, name: source.value.name },
			target: { id: target.value.id, name: target.value.name },
			counts,
			conflicts,
			filledFields: profile.filledFields,
			token: memberMergeFingerprint([
				JSON.stringify({
					source,
					target,
					fillEmptyProfile: input.fillEmptyProfile,
				}),
				...modules.map((module) => module.fingerprint),
			]),
		},
	};
};

export const preview = query({
	args: pairArgs,
	handler: async (ctx, input): Promise<MemberMergePreview> =>
		(await mergePlan(ctx, await requireAdmin(ctx), input)).preview,
});
export const merge = mutation({
	args: {
		...pairArgs,
		token: v.string(),
		confirmation: v.string(),
		key: v.string(),
	},
	handler: async (ctx, input): Promise<string> => {
		const actor = await requireAdmin(ctx);
		if (input.key.length < 16 || input.key.length > 100)
			throw new ConvexError("Reopen the merge preview and try again.");
		const previous = await ctx.db
			.query("memberMerges")
			.withIndex("by_club_source", (q) =>
				q.eq("clubId", actor.clubId).eq("sourceId", input.sourceId),
			)
			.unique();
		if (previous) {
			if (
				previous.key === input.key &&
				previous.actorId === actor.userId &&
				previous.targetId === input.targetId &&
				previous.fillEmptyProfile === input.fillEmptyProfile &&
				previous.token === input.token &&
				previous.targetSnapshot.name === input.confirmation.trim()
			)
				return previous.targetId;
			throw new ConvexError(
				"This profile was already merged. Open its canonical profile.",
			);
		}
		const plan = await mergePlan(ctx, actor, input);
		if (input.confirmation.trim() !== plan.target.value.name)
			throw new ConvexError("Type the target member’s full name to confirm.");
		if (plan.preview.token !== input.token)
			throw new ConvexError(
				"A record changed after this preview. Review the refreshed preview before merging.",
			);
		if (plan.preview.conflicts.length)
			throw new ConvexError(
				"Resolve every listed conflict before merging. No records have changed.",
			);
		for (const module of plan.modules) await module.apply(ctx);
		await ctx.db.patch(plan.target._id, {
			value: {
				...plan.target.value,
				programs: [
					...new Set([
						...plan.target.value.programs,
						...plan.source.value.programs,
					]),
				],
			},
		});
		await ctx.db.patch(plan.source._id, {
			value: {
				...plan.source.value,
				archived: true,
				mergedInto: plan.target.value.id,
				mergedAt: new Date().toISOString(),
			},
		});
		await ctx.db.insert("memberMerges", {
			clubId: actor.clubId,
			sourceId: input.sourceId,
			targetId: input.targetId,
			sourceSnapshot: plan.source.value,
			targetSnapshot: plan.target.value,
			actorId: actor.userId,
			key: input.key,
			token: input.token,
			fillEmptyProfile: input.fillEmptyProfile,
			createdAt: Date.now(),
			counts: plan.preview.counts,
			filledFields: plan.preview.filledFields,
			preserved: plan.modules.flatMap((module) => module.preserved ?? []),
		});
		return plan.target.value.id;
	},
});
