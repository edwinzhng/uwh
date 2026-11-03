import { v } from "convex/values";
import {
	normalizeTerms,
	type TermsState,
	termsError,
} from "../src/domain/terms";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { memberFor } from "./identity";

const actor = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const member = await memberFor(ctx);
	if (!member) throw new Error("Sign in and join a club first.");
	return member;
};
export const current = query({
	args: {},
	handler: async (ctx): Promise<TermsState> => {
		const member = await actor(ctx);
		const settings = await ctx.db
			.query("termsSettings")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.unique();
		const storedPolicy = settings
			? await ctx.db.get(settings.policyId)
			: undefined;
		const policy =
			storedPolicy?.clubId === member.clubId ? storedPolicy : undefined;
		const acceptance = policy
			? await ctx.db
					.query("termsAcceptances")
					.withIndex("by_user_policy", (q) =>
						q.eq("userId", member.userId).eq("policyId", policy._id),
					)
					.unique()
			: undefined;
		return {
			policy: policy
				? {
						id: policy._id,
						version: policy.version,
						title: policy.title,
						body: policy.body,
						publishedAt: policy.publishedAt,
					}
				: undefined,
			required: settings?.required ?? false,
			accepted: !settings?.required || acceptance?.clubId === member.clubId,
			acceptedAt:
				acceptance?.clubId === member.clubId
					? acceptance.acceptedAt
					: undefined,
			revision: settings?.revision ?? 0,
			canManage: member.admin,
		};
	},
});
export const publish = mutation({
	args: {
		version: v.string(),
		title: v.string(),
		body: v.string(),
		revision: v.number(),
		key: v.string(),
		confirmed: v.boolean(),
	},
	handler: async (ctx, input): Promise<Id<"termsVersions">> => {
		const member = await actor(ctx);
		if (!member.admin)
			throw new Error("Only administrators can publish club terms.");
		if (!input.confirmed)
			throw new Error(
				"Confirm that this is your club’s approved policy before publishing.",
			);
		if (input.key.length < 6 || input.key.length > 100)
			throw new Error("Reopen the policy editor before publishing.");
		const draft = normalizeTerms(input);
		const error = termsError(draft);
		if (error) throw new Error(error);
		const previous = await ctx.db
			.query("termsVersions")
			.withIndex("by_club_actor_key", (q) =>
				q
					.eq("clubId", member.clubId)
					.eq("actorId", member.userId)
					.eq("key", input.key),
			)
			.unique();
		if (previous) {
			if (JSON.stringify(normalizeTerms(previous)) !== JSON.stringify(draft))
				throw new Error("This request was already used for different terms.");
			return previous._id;
		}
		const settings = await ctx.db
			.query("termsSettings")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.unique();
		if (input.revision !== (settings?.revision ?? 0))
			throw new Error("The club policy changed. Reopen before publishing.");
		if (
			await ctx.db
				.query("termsVersions")
				.withIndex("by_club_version", (q) =>
					q.eq("clubId", member.clubId).eq("version", draft.version),
				)
				.unique()
		)
			throw new Error(
				"Use a new version for changed terms. Published text is immutable.",
			);
		const policyId = await ctx.db.insert("termsVersions", {
			...draft,
			clubId: member.clubId,
			actorId: member.userId,
			publishedAt: Date.now(),
			key: input.key,
		});
		const value = {
			clubId: member.clubId,
			policyId,
			required: true,
			revision: (settings?.revision ?? 0) + 1,
		};
		if (settings) await ctx.db.patch(settings._id, value);
		else await ctx.db.insert("termsSettings", value);
		return policyId;
	},
});
export const accept = mutation({
	args: { policyId: v.id("termsVersions"), confirmed: v.boolean() },
	handler: async (ctx, input): Promise<void> => {
		const member = await actor(ctx);
		if (!input.confirmed)
			throw new Error("Confirm that you agree before continuing.");
		const settings = await ctx.db
			.query("termsSettings")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.unique();
		if (!settings?.required || settings.policyId !== input.policyId)
			throw new Error("The club terms changed. Review the current version.");
		const policy = await ctx.db.get(input.policyId);
		if (!policy || policy.clubId !== member.clubId)
			throw new Error(
				"The current club terms are unavailable. Contact an administrator.",
			);
		const previous = await ctx.db
			.query("termsAcceptances")
			.withIndex("by_user_policy", (q) =>
				q.eq("userId", member.userId).eq("policyId", input.policyId),
			)
			.unique();
		if (!previous)
			await ctx.db.insert("termsAcceptances", {
				clubId: member.clubId,
				userId: member.userId,
				policyId: input.policyId,
				acceptedAt: Date.now(),
			});
	},
});
export const setRequired = mutation({
	args: { required: v.boolean(), revision: v.number() },
	handler: async (ctx, input): Promise<void> => {
		const member = await actor(ctx);
		if (!member.admin)
			throw new Error("Only administrators can manage club terms.");
		const settings = await ctx.db
			.query("termsSettings")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.unique();
		if (!settings || settings.revision !== input.revision)
			throw new Error("The club policy changed. Refresh before updating.");
		await ctx.db.patch(settings._id, {
			required: input.required,
			revision: settings.revision + 1,
		});
	},
});
