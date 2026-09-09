import { Temporal } from "@js-temporal/polyfill";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { canRegister } from "../src/domain/app-rules";
import {
	type AttendanceReportRow,
	attendanceReportRow,
} from "../src/domain/attendance-report";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import { defaultSeasonId, initialSeasons } from "../src/domain/seasons";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { attendanceFlagValue } from "./attendance_report_schema";
import { requireMember } from "./identity";

const coach = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.coachPrograms.length) throw new Error("Coach access required.");
	return actor;
};
const rangeEvents = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	seasonId: string,
	month?: string,
): Promise<{ events: Doc<"events">[]; limited: boolean }> => {
	const club = await ctx.db.get(actor.clubId);
	const season = (club?.seasons ?? initialSeasons).find(
		(entry) => entry.id === seasonId,
	);
	if (!season) throw new Error("Season not found.");
	if (
		month &&
		(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
			month < season.start.slice(0, 7) ||
			month > season.end.slice(0, 7))
	)
		throw new Error("Choose a month in this season.");
	const today = Temporal.PlainDate.from(clubDate(undefined, club?.timeZone))
		.add({ days: 2 })
		.toString();
	const start = month ? `${month}-01` : "0000-01-01";
	const end = month && `${month}-31` < today ? `${month}-31` : today;
	const read = (id: string | undefined): Promise<Doc<"events">[]> =>
		ctx.db
			.query("events")
			.withIndex("by_season_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("value.seasonId", id)
					.gte("value.date", start)
					.lte("value.date", end),
			)
			.filter((q) =>
				q.and(
					q.eq(q.field("value.cancelled"), false),
					q.neq(q.field("value.kind"), "social"),
				),
			)
			.take(501);
	const [linked, legacy] = await Promise.all([
		read(seasonId),
		seasonId === defaultSeasonId ? read(undefined) : [],
	]);
	const events = [...linked, ...legacy]
		.filter(
			({ value }) =>
				(value.seasonId ?? defaultSeasonId) === seasonId &&
				!value.cancelled &&
				value.kind !== "social" &&
				clubTimestamp(value.date, value.end, value.timeZone) <= Date.now(),
		)
		.sort(
			(a, b) =>
				a.value.date.localeCompare(b.value.date) ||
				a.value.start.localeCompare(b.value.start),
		);
	return {
		events: events.length > 500 ? [] : events,
		limited: events.length > 500 || linked.length > 500 || legacy.length > 500,
	};
};
const buildRow = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	member: Doc<"members">,
	events: Doc<"events">[],
): Promise<AttendanceReportRow> => {
	const records = await Promise.all(
		events.map(async ({ value: event }) => {
			const [response, flag] = await Promise.all([
				ctx.db
					.query("responses")
					.withIndex("by_club_and_key", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.id", `${event.id}:${member.value.id}`),
					)
					.unique(),
				ctx.db
					.query("eventAttendanceFlags")
					.withIndex("by_event_person", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("eventId", event.id)
							.eq("personId", member.value.id),
					)
					.unique(),
			]);
			return { response, flag };
		}),
	);
	return attendanceReportRow(
		member.value,
		events.map((event) => event.value),
		records.flatMap((entry) => (entry.response ? [entry.response.value] : [])),
		records.flatMap((entry) => (entry.flag ? [entry.flag] : [])),
		Date.now(),
	);
};
export const roster = query({
	args: {
		seasonId: v.string(),
		month: v.optional(v.string()),
		search: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const actor = await coach(ctx);
		const { events, limited } = await rangeEvents(
			ctx,
			actor,
			args.seasonId,
			args.month,
		);
		const people = await (args.search?.trim()
			? ctx.db
					.query("members")
					.withSearchIndex("search_name", (q) =>
						q
							.search("value.name", args.search?.trim() ?? "")
							.eq("clubId", actor.clubId),
					)
			: ctx.db
					.query("members")
					.withIndex("by_name", (q) => q.eq("clubId", actor.clubId))
		).paginate({
			...args.paginationOpts,
			numItems: Math.min(
				100,
				args.paginationOpts.numItems,
				Math.max(1, Math.floor(3000 / Math.max(1, events.length * 2))),
			),
		});
		return {
			...people,
			limited,
			page: limited
				? []
				: await Promise.all(
						people.page
							.filter((member) => member.value.programs.length)
							.map((member) => buildRow(ctx, actor, member, events)),
					),
			events: events.map(({ value }) => ({
				id: value.id,
				date: value.date,
				title: value.title,
				start: value.start,
			})),
		};
	},
});
export const comparison = query({
	args: {
		seasonId: v.string(),
		month: v.optional(v.string()),
		personIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const actor = await coach(ctx);
		if (
			args.personIds.length > 4 ||
			new Set(args.personIds).size !== args.personIds.length
		)
			throw new Error("Choose up to four players.");
		const { events, limited: rangeLimited } = await rangeEvents(
			ctx,
			actor,
			args.seasonId,
			args.month,
		);
		const limited =
			rangeLimited || args.personIds.length * events.length * 2 > 3000;
		return {
			limited,
			rows: limited
				? []
				: await Promise.all(
						args.personIds.map(async (id) => {
							const member = await ctx.db
								.query("members")
								.withIndex("by_club_and_key", (q) =>
									q.eq("clubId", actor.clubId).eq("value.id", id),
								)
								.unique();
							if (!member || !member.value.programs.length)
								throw new Error("Player not found.");
							return buildRow(ctx, actor, member, events);
						}),
					),
		};
	},
});
export const eventFlags = query({
	args: { eventId: v.string() },
	handler: async (ctx, { eventId }) => {
		const actor = await coach(ctx);
		return ctx.db
			.query("eventAttendanceFlags")
			.withIndex("by_event", (q) =>
				q.eq("clubId", actor.clubId).eq("eventId", eventId),
			)
			.take(500);
	},
});
export const setFlag = mutation({
	args: {
		eventId: v.string(),
		personId: v.string(),
		kind: v.optional(attendanceFlagValue),
	},
	handler: async (ctx, args) => {
		const actor = await coach(ctx);
		const [event, member, existing] = await Promise.all([
			ctx.db
				.query("events")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", args.eventId),
				)
				.unique(),
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", args.personId),
				)
				.unique(),
			ctx.db
				.query("eventAttendanceFlags")
				.withIndex("by_event_person", (q) =>
					q
						.eq("clubId", actor.clubId)
						.eq("eventId", args.eventId)
						.eq("personId", args.personId),
				)
				.unique(),
		]);
		if (
			!event ||
			event.value.cancelled ||
			!member ||
			!canRegister(member.value, event.value)
		)
			throw new Error("Player or event unavailable.");
		if (!args.kind) {
			if (existing) await ctx.db.delete(existing._id);
			return;
		}
		if (existing) await ctx.db.patch(existing._id, { kind: args.kind });
		else
			await ctx.db.insert("eventAttendanceFlags", {
				...args,
				kind: args.kind,
				clubId: actor.clubId,
			});
	},
});
