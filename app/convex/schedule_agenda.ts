import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { ClubEvent } from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import { eventFinished } from "../src/domain/schedule-agenda";
import { eventWeekday } from "../src/domain/schedule-weekdays";
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
		weekday: v.optional(v.number()),
		now: v.number(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ programId, weekday, now, paginationOpts },
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
					.filter(
						(event) =>
							!eventFinished(event, now) &&
							(weekday === undefined || eventWeekday(event) === weekday),
					),
			),
		};
	},
});
export const recent = query({
	args: {
		programId: v.optional(v.string()),
		weekday: v.optional(v.number()),
		now: v.number(),
	},
	handler: async (
		ctx,
		{ programId, weekday, now },
	): Promise<ScheduleEntry[]> => {
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
			if (
				eventFinished(row.value, now) &&
				(weekday === undefined || eventWeekday(row.value) === weekday)
			)
				return entriesFor(ctx, actor, [row.value]);
		}
		return [];
	},
});

export const historical = query({
	args: {
		programId: v.optional(v.string()),
		weekday: v.optional(v.number()),
		now: v.number(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ programId, weekday, now, paginationOpts },
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
					.filter(
						(event) =>
							eventFinished(event, now) &&
							(weekday === undefined || eventWeekday(event) === weekday),
					),
			),
		};
	},
});

export const weekdays = query({
	args: { now: v.number() },
	handler: async (ctx, { now }): Promise<number[]> => {
		const actor = await requireMember(ctx);
		const days = new Set<number>();
		for await (const row of ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.gte("value.date", addDays(clubDate(now, "UTC"), -14)),
			)
			.order("asc")) {
			if (!row.value.cancelled && !eventFinished(row.value, now))
				days.add(eventWeekday(row.value));
			if (days.size === 7) break;
		}
		return [...days].sort((a, b) => a - b);
	},
});
