import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const assertCanonicalMember = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	personId: string,
): Promise<void> => {
	const member = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", personId),
		)
		.unique();
	if (!member || member.value.mergedInto)
		throw new Error(
			"This profile was merged or is unavailable. Reopen the canonical member before editing.",
		);
};
