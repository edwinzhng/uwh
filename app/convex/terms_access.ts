import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const hasAcceptedTerms = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
): Promise<boolean> => {
	const settings = await ctx.db
		.query("termsSettings")
		.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
		.unique();
	if (!settings?.required) return true;
	const policy = await ctx.db.get(settings.policyId);
	if (!policy || policy.clubId !== member.clubId) return false;
	const acceptance = await ctx.db
		.query("termsAcceptances")
		.withIndex("by_user_policy", (q) =>
			q.eq("userId", member.userId).eq("policyId", settings.policyId),
		)
		.unique();
	return acceptance?.clubId === member.clubId;
};

export const requireAcceptedTerms = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
): Promise<void> => {
	if (!(await hasAcceptedTerms(ctx, member)))
		throw new Error(
			"Review and accept the current club terms before continuing.",
		);
};
