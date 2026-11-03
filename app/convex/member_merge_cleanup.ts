import type { Member } from "../src/domain/app-types";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const mergedMemberHistoryIds = (
	members: readonly Member[],
	ids: readonly string[],
): string[] => {
	const expanded = [
		...new Set([
			...ids,
			...members
				.filter(
					(member) => member.mergedInto && ids.includes(member.mergedInto),
				)
				.map((member) => member.id),
		]),
	];
	return expanded.length === ids.length
		? expanded
		: mergedMemberHistoryIds(members, expanded);
};
export const eraseMemberMerges = async (
	ctx: MutationCtx,
	input: {
		clubId: Id<"clubs">;
		userId: Id<"users">;
		removeClub: boolean;
		personIds?: readonly string[];
	},
): Promise<void> => {
	const records = await ctx.db
		.query("memberMerges")
		.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
		.collect();
	for (const row of records) {
		if (
			input.removeClub ||
			input.personIds?.some((id) => id === row.sourceId || id === row.targetId)
		)
			await ctx.db.delete(row._id);
		else if (row.actorId === input.userId)
			await ctx.db.patch(row._id, { actorId: undefined });
	}
};
