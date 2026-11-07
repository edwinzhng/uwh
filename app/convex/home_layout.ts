import { ConvexError, v } from "convex/values";
import { homeLayoutError } from "../src/domain/home-layout";
import { mutation, query } from "./_generated/server";
import { requireMember } from "./identity";

const viewValue = v.union(v.literal("personal"), v.literal("coaching"));
export const read = query({
	args: { view: viewValue },
	handler: async (ctx, { view }) => {
		const actor = await requireMember(ctx);
		if (view === "coaching" && !actor.coachPrograms.length)
			throw new ConvexError("Coach access required.");
		const row = await ctx.db
			.query("homeLayouts")
			.withIndex("by_user_club_view", (q) =>
				q
					.eq("userId", actor.userId)
					.eq("clubId", actor.clubId)
					.eq("view", view),
			)
			.unique();
		return row
			? { order: row.order, hidden: row.hidden, revision: row.revision }
			: null;
	},
});
export const save = mutation({
	args: {
		view: viewValue,
		order: v.array(v.string()),
		hidden: v.array(v.string()),
		revision: v.number(),
	},
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		if (input.view === "coaching" && !actor.coachPrograms.length)
			throw new ConvexError("Coach access required.");
		const error = homeLayoutError(input.order, input.hidden);
		if (error) throw new ConvexError(error);
		const existing = await ctx.db
			.query("homeLayouts")
			.withIndex("by_user_club_view", (q) =>
				q
					.eq("userId", actor.userId)
					.eq("clubId", actor.clubId)
					.eq("view", input.view),
			)
			.unique();
		if ((existing?.revision ?? 0) !== input.revision)
			throw new ConvexError(
				"Your home layout changed elsewhere. Reopen it to review the latest version.",
			);
		const next = {
			order: input.order,
			hidden: input.hidden,
			revision: input.revision + 1,
		};
		if (existing) await ctx.db.patch(existing._id, next);
		else
			await ctx.db.insert("homeLayouts", {
				...next,
				userId: actor.userId,
				clubId: actor.clubId,
				view: input.view,
			});
	},
});
