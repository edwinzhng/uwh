import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { ClubEvent } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import { eventFinished } from "../src/domain/schedule-agenda";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { eventRows } from "./action_data";
import { loadData } from "./data";
import { accountFor, requireMember } from "./identity";
import type { ScheduleEntry } from "./pages";

const entriesFor = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	events: ClubEvent[],
): Promise<ScheduleEntry[]> => {
	const responses = await eventRows(
		ctx,
		actor.clubId,
		events.map((event) => event.id),
	);
	const loaded = await loadData(ctx, actor.clubId, {
		select: {},
		rows: { responses },
	});
	const visible = visibleAppData({ ...loaded.data, events }, accountFor(actor));
	return events.map((event) => ({
		event,
		responses: visible.responses.filter(
			(response) => response.eventId === event.id,
		),
	}));
};
export const upcoming = query({
	args: {
		programId: v.optional(v.string()),
		now: v.number(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ programId, now, paginationOpts },
	): Promise<PaginationResult<ScheduleEntry>> => {
		const actor = await requireMember(ctx);
		const from = addDays(clubDate(now, "UTC"), -14);
		const rows = programId
			? ctx.db
					.query("events")
					.withIndex("by_program_date", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.program", programId)
							.gte("value.date", from),
					)
			: ctx.db
					.query("events")
					.withIndex("by_date", (q) =>
						q.eq("clubId", actor.clubId).gte("value.date", from),
					);
		const page = await rows.order("asc").paginate({
			...paginationOpts,
			numItems: Math.min(20, paginationOpts.numItems),
			maximumRowsRead: 100,
		});
		return {
			...page,
			page: await entriesFor(
				ctx,
				actor,
				page.page
					.map((row) => row.value)
					.filter((event) => !eventFinished(event, now)),
			),
		};
	},
});
export const recent = query({
	args: { programId: v.optional(v.string()), now: v.number() },
	handler: async (ctx, { programId, now }): Promise<ScheduleEntry[]> => {
		const actor = await requireMember(ctx);
		const through = addDays(clubDate(now, "UTC"), 2);
		const rows = programId
			? ctx.db
					.query("events")
					.withIndex("by_program_date", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.program", programId)
							.lte("value.date", through),
					)
			: ctx.db
					.query("events")
					.withIndex("by_date", (q) =>
						q.eq("clubId", actor.clubId).lte("value.date", through),
					);
		for await (const row of rows.order("desc")) {
			if (eventFinished(row.value, now))
				return entriesFor(ctx, actor, [row.value]);
		}
		return [];
	},
});

export const historical = query({
	args: {
		programId: v.optional(v.string()),
		now: v.number(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ programId, now, paginationOpts },
	): Promise<PaginationResult<ScheduleEntry>> => {
		const actor = await requireMember(ctx);
		const through = addDays(clubDate(now, "UTC"), 2);
		const rows = programId
			? ctx.db
					.query("events")
					.withIndex("by_program_date", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.program", programId)
							.lte("value.date", through),
					)
			: ctx.db
					.query("events")
					.withIndex("by_date", (q) =>
						q.eq("clubId", actor.clubId).lte("value.date", through),
					);
		const page = await rows.order("desc").paginate({
			...paginationOpts,
			numItems: Math.min(20, Math.max(1, paginationOpts.numItems)),
			maximumRowsRead: 100,
		});
		return {
			...page,
			page: await entriesFor(
				ctx,
				actor,
				page.page
					.map((row) => row.value)
					.filter((event) => eventFinished(event, now)),
			),
		};
	},
});
