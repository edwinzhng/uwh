import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { memberFor, requireMember } from "./identity";

const normalize = (text: string): string =>
	text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[\u200B-\u200D\uFEFF]/g, "");
export const checkContent = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
	body: string,
): Promise<void> => {
	const policy = await ctx.db
		.query("chatPolicies")
		.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
		.unique();
	if (
		policy?.blockedPhrases.some((phrase) =>
			normalize(body).includes(normalize(phrase)),
		)
	)
		throw new Error(
			"This message contains a phrase blocked by your club. Please edit it.",
		);
};
export const current = query({
	args: {},
	handler: async (ctx): Promise<string[]> => {
		const member = await memberFor(ctx);
		if (!member?.admin) return [];
		return (
			(
				await ctx.db
					.query("chatPolicies")
					.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
					.unique()
			)?.blockedPhrases ?? []
		);
	},
});
export const save = mutation({
	args: { phrases: v.array(v.string()) },
	handler: async (ctx, { phrases }): Promise<void> => {
		const member = await requireMember(ctx);
		if (!member.admin) throw new Error("Admin access required.");
		const blockedPhrases = [
			...new Set(phrases.map((phrase) => phrase.trim()).filter(Boolean)),
		];
		if (
			blockedPhrases.length > 100 ||
			blockedPhrases.some((phrase) => phrase.length < 2 || phrase.length > 80)
		)
			throw new Error("Use up to 100 phrases, 2–80 characters each.");
		const previous = await ctx.db
			.query("chatPolicies")
			.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
			.unique();
		if (previous) await ctx.db.patch(previous._id, { blockedPhrases });
		else
			await ctx.db.insert("chatPolicies", {
				clubId: member.clubId,
				blockedPhrases,
			});
	},
});
