import { v } from "convex/values";
import type { DevelopmentCoach } from "../src/domain/development";
import {
	type DevelopmentPolicy,
	defaultDevelopmentPolicy,
	developmentReviewers,
	validateDevelopmentPolicy,
} from "../src/domain/development-policy";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireMember } from "./identity";

export const allDevelopmentCoaches = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<DevelopmentCoach[]> =>
	(
		await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect()
	)
		.filter((membership) => membership.coachPrograms.length > 0)
		.map((membership) => ({ id: membership.userId, name: membership.name }));
const currentPolicy = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<Doc<"developmentPolicies"> | undefined> =>
	(await ctx.db
		.query("developmentPolicies")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.unique()) ?? undefined;
export const requiredDevelopmentCoaches = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<DevelopmentCoach[]> => {
	const [coaches, policy, schedule] = await Promise.all([
		allDevelopmentCoaches(ctx, clubId),
		currentPolicy(ctx, clubId),
		ctx.db
			.query("coachingSchedules")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.unique(),
	]);
	return developmentReviewers(
		coaches,
		policy ?? defaultDevelopmentPolicy(),
		schedule?.backupCoachIds ?? [],
		schedule?.days.flatMap((day) => day.coachIds) ?? [],
	);
};
export const state = query({
	args: {},
	handler: async (
		ctx,
	): Promise<{
		policy: DevelopmentPolicy;
		coaches: DevelopmentCoach[];
		requiredIds: string[];
	}> => {
		const member = await requireMember(ctx);
		if (!member.coachPrograms.length && !member.admin)
			throw new Error("Coach access required.");
		const [policy, coaches, required] = await Promise.all([
			currentPolicy(ctx, member.clubId),
			allDevelopmentCoaches(ctx, member.clubId),
			requiredDevelopmentCoaches(ctx, member.clubId),
		]);
		return {
			policy: policy
				? {
						revision: policy.revision,
						mode: policy.mode,
						reviewerIds: policy.reviewerIds,
					}
				: defaultDevelopmentPolicy(),
			coaches,
			requiredIds: required.map((coach) => coach.id),
		};
	},
});
export const save = mutation({
	args: {
		revision: v.number(),
		mode: v.union(v.literal("regular"), v.literal("selected")),
		reviewerIds: v.array(v.string()),
	},
	handler: async (ctx, policy): Promise<void> => {
		const member = await requireMember(ctx);
		if (!member.admin) throw new Error("Administrator access required.");
		const [coaches, previous] = await Promise.all([
			allDevelopmentCoaches(ctx, member.clubId),
			currentPolicy(ctx, member.clubId),
		]);
		const error = validateDevelopmentPolicy(policy, coaches);
		if (error) throw new Error(error);
		if ((previous?.revision ?? 0) !== policy.revision)
			throw new Error("The reviewer policy changed. Reload before saving.");
		const next = {
			...policy,
			reviewerIds: policy.mode === "selected" ? policy.reviewerIds : [],
			revision: policy.revision + 1,
		};
		if (previous) await ctx.db.patch(previous._id, next);
		else
			await ctx.db.insert("developmentPolicies", {
				clubId: member.clubId,
				...next,
			});
	},
});
