import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { fitnessLowerIsBetter } from "../src/domain/fitness";
import type { FitnessOverviewRow } from "../src/domain/fitness-overview";
import { initialSeasons } from "../src/domain/seasons";
import { query } from "./_generated/server";
import { requireMember } from "./identity";

export const read = query({
	args: {
		seasonId: v.string(),
		personId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args): Promise<PaginationResult<FitnessOverviewRow>> => {
		const actor = await requireMember(ctx);
		if (!actor.coachPrograms.length) throw new Error("Coach access required.");
		const club = await ctx.db.get(actor.clubId);
		if (
			!(club?.seasons ?? initialSeasons).some(
				(season) => season.id === args.seasonId,
			)
		)
			throw new Error("Season not found.");
		const personId = args.personId;
		if (personId) {
			const person = await ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", personId),
				)
				.unique();
			if (!person || person.value.archived || person.value.mergedInto)
				throw new Error("Choose a current player.");
		}
		const page = await ctx.db
			.query("fitnessTests")
			.withIndex("by_club_archive", (q) =>
				q.eq("clubId", actor.clubId).eq("archived", false),
			)
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(10, Math.max(1, args.paginationOpts.numItems)),
				maximumRowsRead: 10,
			});
		return {
			...page,
			page: await Promise.all(
				page.page.map(async (test): Promise<FitnessOverviewRow> => {
					const [best, personal, latest] = await Promise.all([
						ctx.db
							.query("fitnessStats")
							.withIndex("by_test_season_best", (q) =>
								q.eq("testId", test._id).eq("seasonId", args.seasonId),
							)
							.order(fitnessLowerIsBetter(test) ? "asc" : "desc")
							.first(),
						personId
							? ctx.db
									.query("fitnessStats")
									.withIndex("by_test_season_person", (q) =>
										q
											.eq("testId", test._id)
											.eq("seasonId", args.seasonId)
											.eq("personId", personId),
									)
									.unique()
							: undefined,
						personId
							? ctx.db
									.query("fitnessResults")
									.withIndex("by_person_date", (q) =>
										q
											.eq("testId", test._id)
											.eq("seasonId", args.seasonId)
											.eq("personId", personId),
									)
									.order("desc")
									.first()
							: undefined,
					]);
					const holder = best
						? await ctx.db
								.query("members")
								.withIndex("by_club_and_key", (q) =>
									q.eq("clubId", actor.clubId).eq("value.id", best.personId),
								)
								.unique()
						: undefined;
					return {
						test: {
							_id: test._id,
							name: test.name,
							unit: test.unit,
							lowerIsBetter: test.lowerIsBetter,
							archived: test.archived,
							revision: test.revision,
						},
						personal: personal
							? {
									count: personal.count,
									total: personal.total,
									best: personal.best,
								}
							: undefined,
						latest: latest
							? { date: latest.date, value: latest.value }
							: undefined,
						teamBest: best
							? {
									name: holder?.value.name ?? "Former member",
									value: best.best,
								}
							: undefined,
					};
				}),
			),
		};
	},
});
