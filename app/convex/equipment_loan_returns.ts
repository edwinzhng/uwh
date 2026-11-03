import type { PaginationResult } from "convex/server";
import { loanBorrowerDescription } from "../src/domain/equipment-loans";
import type { QueryCtx } from "./_generated/server";
import { memberFor } from "./identity";

export const equipmentLoanReturns = async (
	ctx: QueryCtx,
	input: {
		search?: string;
		paginationOpts: { numItems: number; cursor: string | null };
	},
): Promise<PaginationResult<{ id: string; item: string; person: string }>> => {
	const actor = await memberFor(ctx);
	if (!actor?.admin) return { page: [], isDone: true, continueCursor: "" };
	const page = await ctx.db
		.query("loans")
		.withIndex("by_returned", (q) =>
			q.eq("clubId", actor.clubId).eq("value.returned", true),
		)
		.order("desc")
		.paginate({
			...input.paginationOpts,
			numItems: Math.min(40, Math.max(1, input.paginationOpts.numItems)),
			maximumRowsRead: 200,
		});
	const projected = await Promise.all(
		page.page.map(
			async (row): Promise<{ id: string; item: string; person: string }> => {
				const loan = row.value;
				const [item, person] = await Promise.all([
					ctx.db
						.query("equipment")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", actor.clubId).eq("value.id", loan.itemId),
						)
						.unique(),
					"personId" in loan
						? ctx.db
								.query("members")
								.withIndex("by_club_and_key", (q) =>
									q.eq("clubId", actor.clubId).eq("value.id", loan.personId),
								)
								.unique()
						: undefined,
				]);
				return {
					id: loan.id,
					item: item?.value.name ?? "Equipment",
					person: loanBorrowerDescription(loan, person ? [person.value] : []),
				};
			},
		),
	);
	const term = input.search?.trim().toLowerCase();
	return {
		...page,
		page: term
			? projected.filter((entry) =>
					`${entry.item} ${entry.person}`.toLowerCase().includes(term),
				)
			: projected,
	};
};
