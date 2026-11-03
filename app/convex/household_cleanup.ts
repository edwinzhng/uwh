import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const revokeRemovedHouseholdLinks = async (
	ctx: MutationCtx,
	target: Doc<"memberships">,
	children: readonly string[],
): Promise<void> => {
	const links = await ctx.db
		.query("householdLinks")
		.withIndex("by_club_user", (q) =>
			q.eq("clubId", target.clubId).eq("userId", target.userId),
		)
		.collect();
	for (const row of links)
		await ctx.db.patch(row._id, {
			state: children.includes(row.personId) ? "accepted" : "revoked",
		});
};
export const eraseHouseholdLinks = async (
	ctx: MutationCtx,
	input: {
		clubId?: Id<"clubs">;
		userId: Id<"users">;
		removeClub: boolean;
		personIds?: readonly string[];
	},
): Promise<void> => {
	const clubId = input.clubId;
	const rows = clubId
		? await ctx.db
				.query("householdLinks")
				.withIndex("by_club", (q) => q.eq("clubId", clubId))
				.collect()
		: await ctx.db
				.query("householdLinks")
				.withIndex("by_user", (q) => q.eq("userId", input.userId))
				.collect();
	for (const row of rows) {
		if (
			input.removeClub ||
			row.userId === input.userId ||
			input.personIds?.includes(row.personId)
		)
			await ctx.db.delete(row._id);
		else if (row.createdBy === input.userId)
			await ctx.db.patch(row._id, { createdBy: undefined });
	}
};
