import { Temporal } from "@js-temporal/polyfill";
import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	canCoachMember,
	canReadProgress,
	memberRoles,
} from "../src/domain/app-rules";
import type {
	ClubEvent,
	CoachingFeedback,
	EventResponse,
	Member,
	Notice,
	Payment,
} from "../src/domain/app-types";
import { visibleAppData } from "../src/domain/app-visibility";
import { clubDate, clubTimestamp, eventDates } from "../src/domain/event-time";
import { groupBy } from "../src/domain/group-by";
import { relevantHouseholdEvent } from "../src/domain/home";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { eventRows } from "./action_data";
import { loadData } from "./data";
import { accountFor, memberFor } from "./identity";

const empty = <T>(): PaginationResult<T> => ({
	page: [],
	isDone: true,
	continueCursor: "",
});
const pageOptions = (options: { numItems: number; cursor: string | null }) => ({
	...options,
	numItems: Math.min(40, Math.max(1, options.numItems)),
	maximumRowsRead: 200,
});
export type ScheduleEntry = { event: ClubEvent; responses: EventResponse[] };
export const schedule = query({
	args: {
		audience: v.optional(v.union(v.literal("household"), v.literal("all"))),
		view: v.union(
			v.literal("upcoming"),
			v.literal("past"),
			v.literal("calendar"),
		),
		date: v.string(),
		season: v.string(),
		now: v.number(),
		period: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ view, date, season, now, period, paginationOpts, audience },
	): Promise<PaginationResult<ScheduleEntry>> => {
		const member = await memberFor(ctx);
		if (!member) return empty();
		const household = await householdPeople(ctx, member);
		const today = Temporal.PlainDate.from(clubDate(now, "UTC"));
		const upcomingFrom = today.subtract({ days: 14 }).toString();
		const pastThrough = today.add({ days: 2 }).toString();
		const filtered =
			season !== "all" && season !== "2026-2027"
				? ctx.db.query("events").withIndex("by_season_date", (q) => {
						const range = q
							.eq("clubId", member.clubId)
							.eq("value.seasonId", season);
						return view === "calendar"
							? range
									.gte(
										"value.date",
										Temporal.PlainDate.from(date)
											.subtract({ days: 13 })
											.toString(),
									)
									.lte("value.date", date)
							: view === "past"
								? range.lte("value.date", pastThrough)
								: range.gte("value.date", upcomingFrom);
					})
				: ctx.db
						.query("events")
						.withIndex("by_date", (q) => {
							const range = q.eq("clubId", member.clubId);
							return view === "calendar"
								? range
										.gte(
											"value.date",
											Temporal.PlainDate.from(date)
												.subtract({ days: 13 })
												.toString(),
										)
										.lte("value.date", date)
								: view === "past"
									? range.lte("value.date", pastThrough)
									: range.gte("value.date", upcomingFrom);
						})
						.filter((q) =>
							season === "all"
								? q.eq(1, 1)
								: season === "2026-2027"
									? q.or(
											q.eq(q.field("value.seasonId"), season),
											q.eq(q.field("value.seasonId"), undefined),
										)
									: q.eq(q.field("value.seasonId"), season),
						);
		const result = await filtered
			.filter((q) =>
				audience !== "household"
					? q.eq(1, 1)
					: q.or(
							q.eq(q.field("value.program"), "all"),
							...[
								...new Set(household.flatMap((person) => person.programs)),
							].map((program) => q.eq(q.field("value.program"), program)),
						),
			)
			.filter((q) =>
				view === "calendar"
					? q.or(
							q.eq(q.field("value.date"), date),
							q.gte(q.field("value.endDate"), date),
						)
					: view === "upcoming"
						? q.or(
								q.gte(
									q.field("value.date"),
									today.subtract({ days: 2 }).toString(),
								),
								q.gte(
									q.field("value.endDate"),
									today.subtract({ days: 2 }).toString(),
								),
							)
						: q.eq(1, 1),
			)
			.order(view === "past" ? "desc" : "asc")
			.paginate(pageOptions(paginationOpts));
		const events = result.page
			.filter(
				(row) =>
					audience !== "household" ||
					relevantHouseholdEvent(row.value, household),
			)
			.map((row) => ({
				...row.value,
				seasonId: row.value.seasonId ?? "2026-2027",
			}))
			.filter(
				(event) =>
					(view === "calendar" && !period) ||
					clubTimestamp(
						event.endDate ?? event.date,
						event.end,
						event.timeZone,
					) <=
						now ===
						((period ?? view) === "past"),
			);
		const calendarEvents =
			view === "calendar"
				? events.filter((event) => eventDates(event).includes(date))
				: events;
		const responses = await eventRows(
			ctx,
			member.clubId,
			calendarEvents.map((event) => event.id),
		);
		const { data } = await loadData(ctx, member.clubId, {
			select: {},
			rows: { events: result.page, responses },
		});
		const visible = visibleAppData(data, accountFor(member));
		const byEvent = groupBy(visible.responses, (response) => response.eventId);
		return {
			...result,
			page: calendarEvents.map((event) => ({
				event,
				responses: byEvent.get(event.id) ?? [],
			})),
		};
	},
});
export const calendar = query({
	args: {
		audience: v.optional(v.union(v.literal("household"), v.literal("all"))),
		from: v.string(),
		to: v.string(),
		season: v.string(),
		now: v.optional(v.number()),
		period: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
	},
	handler: async (
		ctx,
		{ from, to, season, now, period, audience },
	): Promise<Record<string, number>> => {
		const member = await memberFor(ctx);
		if (!member) return {};
		const household = await householdPeople(ctx, member);
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(from) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(to) ||
			!Number.isFinite(Date.parse(from)) ||
			!Number.isFinite(Date.parse(to)) ||
			to < from ||
			Date.parse(to) - Date.parse(from) > 42 * 86400000
		)
			throw new Error("Choose a calendar month.");
		const events = await ctx.db
			.query("events")
			.withIndex("by_date", (q) =>
				q
					.eq("clubId", member.clubId)
					.gte(
						"value.date",
						Temporal.PlainDate.from(from).subtract({ days: 13 }).toString(),
					)
					.lte("value.date", to),
			)
			.collect();
		return events
			.filter(
				(row) =>
					!row.value.cancelled &&
					(audience !== "household" ||
						relevantHouseholdEvent(row.value, household)) &&
					(!period ||
						now === undefined ||
						clubTimestamp(
							row.value.endDate ?? row.value.date,
							row.value.end,
							row.value.timeZone,
						) <=
							now ===
							(period === "past")) &&
					(season === "all" || (row.value.seasonId ?? "2026-2027") === season),
			)
			.flatMap((row) => eventDates(row.value))
			.filter((date) => date >= from && date <= to)
			.reduce<Record<string, number>>((counts, date) => {
				counts[date] = (counts[date] ?? 0) + 1;
				return counts;
			}, {});
	},
});
export const members = query({
	args: { search: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ search, paginationOpts },
	): Promise<PaginationResult<{ member: Member; roles: string }>> => {
		const actor = await memberFor(ctx);
		if (!actor) return empty();
		const account = accountFor(actor);
		const result = await (search.trim()
			? ctx.db
					.query("members")
					.withSearchIndex("search_name", (q) =>
						q
							.search("value.name", search.trim().slice(0, 100))
							.eq("clubId", actor.clubId),
					)
			: ctx.db
					.query("members")
					.withIndex("by_name", (q) => q.eq("clubId", actor.clubId))
		).paginate(pageOptions(paginationOpts));
		const { data } = await loadData(ctx, actor.clubId, {
			select: {},
			rows: { members: result.page },
		});
		const visible = visibleAppData(data, account);
		return {
			...result,
			page: await Promise.all(
				visible.members.map(
					async (member): Promise<{ member: Member; roles: string }> => {
						const accounts = await ctx.db
							.query("memberships")
							.withIndex("by_person", (q) =>
								q.eq("clubId", actor.clubId).eq("personId", member.id),
							)
							.collect();
						return {
							member,
							roles: memberRoles(member, accounts.map(accountFor)),
						};
					},
				),
			),
		};
	},
});
const progressMember = async (
	ctx: QueryCtx,
	personId: string,
): Promise<{ actor: Doc<"memberships">; member: Member } | undefined> => {
	const actor = await memberFor(ctx);
	if (!actor) return;
	const member = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", personId),
		)
		.unique();
	return member && canReadProgress(accountFor(actor), member.value)
		? { actor, member: member.value }
		: undefined;
};
export const feedback = query({
	args: {
		personId: v.string(),
		visibility: v.union(v.literal("published"), v.literal("private")),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ personId, visibility, paginationOpts },
	): Promise<PaginationResult<CoachingFeedback>> => {
		const access = await progressMember(ctx, personId);
		if (!access) return empty();
		if (
			visibility === "private" &&
			!canCoachMember(accountFor(access.actor), access.member)
		)
			return empty();
		const result = await ctx.db
			.query("feedback")
			.withIndex("by_person_date", (q) =>
				q.eq("clubId", access.actor.clubId).eq("value.personId", personId),
			)
			.filter((q) =>
				visibility === "published"
					? q.eq(q.field("value.visibility"), "published")
					: q.neq(q.field("value.visibility"), "published"),
			)
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		return { ...result, page: result.page.map((row) => row.value) };
	},
});
export const payments = query({
	args: { personId: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ personId, paginationOpts },
	): Promise<PaginationResult<Payment>> => {
		const member = await memberFor(ctx);
		if (
			!member ||
			(!member.admin &&
				personId !== member.personId &&
				!member.children.includes(personId))
		)
			return empty();
		const result = await ctx.db
			.query("payments")
			.withIndex("by_person", (q) =>
				q.eq("clubId", member.clubId).eq("value.personId", personId),
			)
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		return { ...result, page: result.page.map((row) => row.value) };
	},
});
export const returns = query({
	args: {
		search: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ search, paginationOpts },
	): Promise<
		PaginationResult<{ id: string; item: string; person: string }>
	> => {
		const member = await memberFor(ctx);
		if (!member?.admin) return empty();
		const term = search?.trim().toLowerCase();
		const matches = term
			? await loadData(ctx, member.clubId, {
					select: { members: true, equipment: true },
				})
			: undefined;
		const people =
			matches?.data.members
				.filter((person) => person.name.toLowerCase().includes(term ?? ""))
				.map((person) => person.id) ?? [];
		const equipment =
			matches?.data.equipment
				.filter((item) => item.name.toLowerCase().includes(term ?? ""))
				.map((item) => item.id) ?? [];
		if (term && !people.length && !equipment.length) return empty();
		const result = await ctx.db
			.query("loans")
			.withIndex("by_returned", (q) =>
				q.eq("clubId", member.clubId).eq("value.returned", true),
			)
			.filter((q) =>
				term
					? q.or(
							...people.map((id) => q.eq(q.field("value.personId"), id)),
							...equipment.map((id) => q.eq(q.field("value.itemId"), id)),
						)
					: q.eq(1, 1),
			)
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		return {
			...result,
			page: await Promise.all(
				result.page.map(
					async (
						row,
					): Promise<{ id: string; item: string; person: string }> => {
						const [item, person] = await Promise.all([
							ctx.db
								.query("equipment")
								.withIndex("by_club_and_key", (q) =>
									q
										.eq("clubId", member.clubId)
										.eq("value.id", row.value.itemId),
								)
								.unique(),
							ctx.db
								.query("members")
								.withIndex("by_club_and_key", (q) =>
									q
										.eq("clubId", member.clubId)
										.eq("value.id", row.value.personId),
								)
								.unique(),
						]);
						return {
							id: row.value.id,
							item: item?.value.name ?? "Equipment",
							person: person?.value.name ?? "Former member",
						};
					},
				),
			),
		};
	},
});
export const notices = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ paginationOpts },
	): Promise<PaginationResult<Notice>> => {
		const member = await memberFor(ctx);
		if (!member) return empty();
		const result = await ctx.db
			.query("notices")
			.withIndex("by_date", (q) => q.eq("clubId", member.clubId))
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		const { data } = await loadData(ctx, member.clubId, {
			select: { members: [member.personId, ...member.children] },
			rows: { notices: result.page },
		});
		return {
			...result,
			page: visibleAppData(data, accountFor(member)).notices,
		};
	},
});

export const activeNotices = query({
	args: { today: v.string() },
	handler: async (ctx): Promise<Notice[]> => {
		const member = await memberFor(ctx);
		if (!member) return [];
		const club = await ctx.db.get(member.clubId);
		const today = clubDate(undefined, club?.timeZone);
		const rows = await ctx.db
			.query("notices")
			.withIndex("by_date", (q) => q.eq("clubId", member.clubId))
			.order("desc")
			.filter((q) =>
				q.or(
					q.eq(q.field("value.expiresAt"), undefined),
					q.gt(q.field("value.expiresAt"), today),
				),
			)
			.collect();
		const { data } = await loadData(ctx, member.clubId, {
			select: { members: [member.personId, ...member.children] },
			rows: { notices: rows },
		});
		return visibleAppData(data, accountFor(member)).notices;
	},
});

const householdPeople = async (
	ctx: QueryCtx,
	member: Doc<"memberships">,
): Promise<Member[]> => {
	const people = await Promise.all(
		[member.personId, ...member.children].map((personId) =>
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", member.clubId).eq("value.id", personId),
				)
				.unique(),
		),
	);
	return people.flatMap((person) => (person ? [person.value] : []));
};
