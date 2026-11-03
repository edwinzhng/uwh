import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { canManagePerson } from "../src/domain/app-rules";
import { publishedEventLineups } from "../src/domain/event-lineups";
import {
	type CarryLineupSource,
	compatibleCarrySource,
} from "../src/domain/lineup-carry";
import { query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";

export const sources = query({
	args: {
		eventId: v.string(),
		partId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ eventId, partId, paginationOpts },
	): Promise<PaginationResult<CarryLineupSource>> => {
		const actor = await requireMember(ctx);
		if (!actor.coachPrograms.length) throw new Error("Coach access required.");
		const target = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", eventId),
			)
			.unique();
		if (
			!target ||
			target.value.cancelled ||
			(partId && !target.value.parts?.some((entry) => entry.id === partId))
		)
			throw new Error("Choose a current practice.");
		const page = await ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q.eq("clubId", actor.clubId).lte("value.date", target.value.date),
			)
			.order("desc")
			.filter((q) =>
				q.and(
					q.eq(q.field("value.program"), target.value.program),
					q.eq(q.field("value.cancelled"), false),
				),
			)
			.paginate({
				...paginationOpts,
				numItems: Math.min(20, Math.max(1, paginationOpts.numItems)),
				maximumRowsRead: 100,
			});
		const sources = await Promise.all(
			page.page.map(async (event): Promise<CarryLineupSource[]> => {
				const plans = await ctx.db
					.query("teams")
					.withIndex("by_event", (q) =>
						q.eq("clubId", actor.clubId).eq("value.eventId", event.value.id),
					)
					.collect();
				return plans.flatMap(({ value: plan }) =>
					plan.published &&
					!plan.coachingStale &&
					compatibleCarrySource(event.value, target.value, plan.partId, partId)
						? [
								{
									eventId: event.value.id,
									partId: plan.partId,
									title: `${event.value.title}${plan.partId ? ` · ${event.value.parts?.find((part) => part.id === plan.partId)?.title ?? plan.partId}` : ""}`,
									date: event.value.date,
									revision: plan.revision ?? 0,
								},
							]
						: [],
				);
			}),
		);
		return { ...page, page: sources.flat() };
	},
});

export const available = query({
	args: { eventId: v.string(), personId: v.string() },
	handler: async (ctx, { eventId, personId }): Promise<boolean> => {
		const actor = await requireMember(ctx);
		if (!canManagePerson(accountFor(actor), personId)) return false;
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", eventId),
			)
			.unique();
		if (!event || event.value.cancelled) return false;
		const [plans, response] = await Promise.all([
			ctx.db
				.query("teams")
				.withIndex("by_event", (q) =>
					q.eq("clubId", actor.clubId).eq("value.eventId", eventId),
				)
				.take(14),
			ctx.db
				.query("responses")
				.withIndex("by_event", (q) =>
					q.eq("clubId", actor.clubId).eq("value.eventId", eventId),
				)
				.filter((q) => q.eq(q.field("value.personId"), personId))
				.first(),
		]);
		return (
			publishedEventLineups(
				event.value,
				plans.map((row) => row.value),
				personId,
				response?.value,
			).length > 0
		);
	},
});
