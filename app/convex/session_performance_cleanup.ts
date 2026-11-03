import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const eraseSessionPerformance = async (
	ctx: MutationCtx,
	input: {
		clubId: Id<"clubs">;
		userId: Id<"users">;
		removeClub: boolean;
		personIds?: string[];
	},
): Promise<void> => {
	const [entries, requests, reports] = await Promise.all([
		input.removeClub
			? ctx.db
					.query("sessionPerformance")
					.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
					.collect()
			: Promise.all([
					ctx.db
						.query("sessionPerformance")
						.withIndex("by_author", (q) => q.eq("authorId", input.userId))
						.collect(),
					...[...new Set(input.personIds ?? [])].map((personId) =>
						ctx.db
							.query("sessionPerformance")
							.withIndex("by_person", (q) =>
								q.eq("clubId", input.clubId).eq("personId", personId),
							)
							.collect(),
					),
				]).then((rows) => rows.flat()),
		input.removeClub
			? ctx.db
					.query("sessionPerformanceRequests")
					.withIndex("by_club", (q) => q.eq("clubId", input.clubId))
					.collect()
			: Promise.all([
					ctx.db
						.query("sessionPerformanceRequests")
						.withIndex("by_actor", (q) => q.eq("actorId", input.userId))
						.collect(),
					...[...new Set(input.personIds ?? [])].map((personId) =>
						ctx.db
							.query("sessionPerformanceRequests")
							.withIndex("by_person", (q) =>
								q.eq("clubId", input.clubId).eq("personId", personId),
							)
							.collect(),
					),
				]).then((rows) => rows.flat()),
		Promise.all(
			[...new Set(input.personIds ?? [])].map((personId) =>
				ctx.db
					.query("chatReports")
					.withIndex("by_source_person", (q) =>
						q.eq("clubId", input.clubId).eq("source.personId", personId),
					)
					.collect(),
			),
		).then((rows) => rows.flat()),
	]);
	for (const row of new Map(
		[...entries, ...requests, ...reports].map((row) => [row._id, row]),
	).values())
		if (row.clubId === input.clubId) await ctx.db.delete(row._id);
};
