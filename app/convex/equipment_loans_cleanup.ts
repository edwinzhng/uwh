import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseEquipmentLoans = async (
	ctx: MutationCtx,
	input: {
		userId: Id<"users">;
		clubId?: Id<"clubs">;
		removeClub: boolean;
		personIds?: readonly string[];
	},
): Promise<void> => {
	const clubId = input.clubId;
	const receipts =
		input.removeClub && clubId
			? await ctx.db
					.query("equipmentLoanCommands")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect()
			: await ctx.db
					.query("equipmentLoanCommands")
					.withIndex("by_actor", (q) => q.eq("actorId", input.userId))
					.collect();
	for (const receipt of receipts) await ctx.db.delete(receipt._id);
	if (clubId && !input.removeClub)
		for (const personId of input.personIds ?? [])
			for (const receipt of await ctx.db
				.query("equipmentLoanCommands")
				.withIndex("by_club_person", (q) =>
					q.eq("clubId", clubId).eq("personId", personId),
				)
				.collect())
				await ctx.db.delete(receipt._id);
	const guests =
		input.removeClub && clubId
			? await ctx.db
					.query("equipmentGuests")
					.withIndex("by_club", (q) => q.eq("clubId", clubId))
					.collect()
			: await ctx.db
					.query("equipmentGuests")
					.withIndex("by_creator", (q) => q.eq("createdBy", input.userId))
					.collect();
	for (const guest of guests) {
		if (input.removeClub) await ctx.db.delete(guest._id);
		else await ctx.db.patch(guest._id, { createdBy: undefined });
	}
};
