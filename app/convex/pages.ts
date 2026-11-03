import { Temporal } from "@js-temporal/polyfill";
import {
	type PaginationOptions,
	type PaginationResult,
	paginationOptsValidator,
} from "convex/server";
import { v } from "convex/values";
import {
	canCoach,
	canCoachMember,
	canManagePerson,
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
import {
	type CoachingTasks,
	coachingTasks,
} from "../src/domain/coaching-dashboard";
import { clubDate, clubTimestamp, eventDates } from "../src/domain/event-time";
import {
	eventKindsForFilter,
	matchesEventType,
} from "../src/domain/event-types";
import { canReadFeedback } from "../src/domain/feedback-access";
import { groupBy } from "../src/domain/group-by";
import { relevantHouseholdEvent } from "../src/domain/home";
import {
	type ClubShoutout,
	publicFeedback,
	shoutoutRecipientIds,
	shoutoutSummary,
} from "../src/domain/shoutouts";
import type { Doc } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";
import { eventRows } from "./action_data";
import { loadData } from "./data";
import { equipmentLoanReturns } from "./equipment_loan_returns";
import { homeAnnouncementPage } from "./home_announcement";
import { accountFor, memberFor } from "./identity";

const eventTypeValue = v.optional(
	v.union(
		v.literal("all"),
		v.literal("practice"),
		v.literal("tournament"),
		v.literal("other"),
	),
);

const empty = <T>(): PaginationResult<T> => ({
	page: [],
	isDone: true,
	continueCursor: "",
});

export const coachingHome = query({
	args: {},
	handler: async (ctx): Promise<CoachingTasks> => {
		const actor = await memberFor(ctx);
		if (!actor || !canCoach(accountFor(actor)))
			return { goals: [], drafts: [], morePlayers: false, moreDrafts: false };
		const [people, drafts] = await Promise.all([
			ctx.db
				.query("members")
				.withIndex("by_pending_goal", (q) =>
					q.eq("clubId", actor.clubId).gt("value.pendingGoal", ""),
				)
				.filter((q) =>
					q.and(
						q.neq(q.field("value.archived"), true),
						q.eq(q.field("value.mergedInto"), undefined),
					),
				)
				.take(5),
			ctx.db
				.query("feedback")
				.withIndex("by_author_visibility", (q) =>
					q
						.eq("clubId", actor.clubId)
						.eq("value.authorId", actor.userId)
						.eq("value.visibility", "draft"),
				)
				.order("desc")
				.take(5),
		]);
		const draftPeople = await Promise.all(
			drafts.map((entry) =>
				ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", actor.clubId).eq("value.id", entry.value.personId),
					)
					.unique(),
			),
		);
		return coachingTasks(
			accountFor(actor),
			[...people, ...draftPeople.filter((person) => person !== null)].map(
				(row) => row.value,
			),
			drafts.map((row) => row.value),
			people.length > 4,
			drafts.length > 4,
		);
	},
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
		eventType: eventTypeValue,
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
		{
			view,
			date,
			season,
			now,
			period,
			paginationOpts,
			audience,
			eventType = "all",
		},
	): Promise<PaginationResult<ScheduleEntry>> => {
		const member = await memberFor(ctx);
		if (!member) return empty();
		const household = await householdPeople(ctx, member);
		const today = Temporal.PlainDate.from(clubDate(now, "UTC"));
		const upcomingFrom = today.subtract({ days: 14 }).toString();
		const pastThrough = today.add({ days: 2 }).toString();
		const filtered =
			eventType !== "all" && eventType !== "practice" && eventType !== "other"
				? ctx.db.query("events").withIndex("by_club_kind_date", (q) => {
						const range = q
							.eq("clubId", member.clubId)
							.eq("value.kind", eventType);
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
				: season !== "all" && season !== "2026-2027"
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
		const seasonFiltered =
			eventType !== "all" && eventType !== "practice"
				? filtered.filter((q) =>
						season === "all"
							? q.eq(1, 1)
							: season === "2026-2027"
								? q.or(
										q.eq(q.field("value.seasonId"), season),
										q.eq(q.field("value.seasonId"), undefined),
									)
								: q.eq(q.field("value.seasonId"), season),
					)
				: filtered;
		const kindFiltered =
			eventType === "practice"
				? seasonFiltered.filter((q) =>
						q.or(
							...eventKindsForFilter(eventType).map((kind) =>
								q.eq(q.field("value.kind"), kind),
							),
						),
					)
				: seasonFiltered;
		const result = await kindFiltered
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
		eventType: eventTypeValue,
		from: v.string(),
		to: v.string(),
		season: v.string(),
		now: v.optional(v.number()),
		period: v.optional(v.union(v.literal("upcoming"), v.literal("past"))),
	},
	handler: async (
		ctx,
		{ from, to, season, now, period, audience, eventType = "all" },
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
					matchesEventType(row.value, eventType) &&
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
	args: {
		search: v.string(),
		archived: v.optional(v.boolean()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ search, archived = false, paginationOpts },
	): Promise<PaginationResult<{ member: Member; roles: string }>> => {
		const actor = await memberFor(ctx);
		if (!actor) return empty();
		const account = accountFor(actor);
		if (archived && !account.admin && !canCoach(account)) return empty();
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
		)
			.filter((q) =>
				archived
					? q.eq(q.field("value.archived"), true)
					: q.neq(q.field("value.archived"), true),
			)
			.paginate(pageOptions(paginationOpts));
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
export const feedback = query({
	args: {
		personId: v.string(),
		visibility: v.union(v.literal("published"), v.literal("private")),
		kind: v.optional(v.union(v.literal("coaching"), v.literal("shoutout"))),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ personId, visibility, kind, paginationOpts },
	): Promise<PaginationResult<CoachingFeedback>> => {
		const actor = await memberFor(ctx);
		if (!actor) return empty();
		const member = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", personId),
			)
			.unique();
		if (!member) return empty();
		const account = accountFor(actor);
		const progress = canReadProgress(account, member.value);
		const own = canManagePerson(account, personId);
		if (kind === "shoutout" && !own) return empty();
		if (!progress && !own) return empty();
		if (visibility === "private" && !canCoachMember(account, member.value))
			return empty();
		if (kind === "coaching" && !progress) return empty();
		const result = await ctx.db
			.query("feedback")
			.withIndex("by_person_date", (q) =>
				q.eq("clubId", actor.clubId).eq("value.personId", personId),
			)
			.filter((q) =>
				q.and(
					visibility === "published"
						? q.eq(q.field("value.visibility"), "published")
						: q.neq(q.field("value.visibility"), "published"),
					...(kind === "shoutout" || !progress
						? [q.eq(q.field("value.kind"), "shoutout")]
						: kind === "coaching" || !own
							? [q.neq(q.field("value.kind"), "shoutout")]
							: []),
				),
			)
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		return {
			...result,
			page: result.page
				.map((row) => row.value)
				.filter((entry) => canReadFeedback(entry, account, member.value))
				.map(publicFeedback),
		};
	},
});
export const shoutouts = query({
	args: {
		personId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (
		ctx,
		{ personId, paginationOpts },
	): Promise<PaginationResult<ClubShoutout>> => {
		const actor = await memberFor(ctx);
		if (!actor) return empty();
		const recipients = shoutoutRecipientIds(accountFor(actor), personId);
		if (!recipients.length) return empty();
		const rows = personId
			? ctx.db
					.query("feedback")
					.withIndex("by_person_date", (q) =>
						q.eq("clubId", actor.clubId).eq("value.personId", personId),
					)
			: ctx.db
					.query("feedback")
					.withIndex("by_club_kind_visibility_date", (q) =>
						q
							.eq("clubId", actor.clubId)
							.eq("value.kind", "shoutout")
							.eq("value.visibility", "published"),
					);
		const result = await rows
			.filter((q) =>
				q.and(
					q.eq(q.field("value.kind"), "shoutout"),
					q.eq(q.field("value.visibility"), "published"),
				),
			)
			.filter((q) =>
				q.or(...recipients.map((id) => q.eq(q.field("value.personId"), id))),
			)
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		return {
			...result,
			page: await Promise.all(
				result.page.map(async (row): Promise<ClubShoutout> => {
					const person = await ctx.db
						.query("members")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", actor.clubId).eq("value.id", row.value.personId),
						)
						.unique();
					return {
						...publicFeedback(row.value),
						personName: person?.value.name ?? "Former player",
					};
				}),
			),
		};
	},
});
export const recognition = query({
	args: { personId: v.string() },
	handler: async (ctx, { personId }) => {
		const actor = await memberFor(ctx);
		if (!actor || !canManagePerson(accountFor(actor), personId))
			return { total: 0, categories: [], limited: false };
		const rows = await ctx.db
			.query("feedback")
			.withIndex("by_person_date", (q) =>
				q.eq("clubId", actor.clubId).eq("value.personId", personId),
			)
			.filter((q) =>
				q.and(
					q.eq(q.field("value.kind"), "shoutout"),
					q.eq(q.field("value.visibility"), "published"),
				),
			)
			.order("desc")
			.take(201);
		const entries = rows.slice(0, 200).map((row) => row.value);
		return {
			total: entries.length,
			categories: shoutoutSummary(entries),
			limited: rows.length > 200,
		};
	},
});
export const sessionShoutouts = query({
	args: { eventId: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		{ eventId, paginationOpts },
	): Promise<PaginationResult<CoachingFeedback>> => {
		const actor = await memberFor(ctx);
		if (!actor) return empty();
		const recipients = shoutoutRecipientIds(accountFor(actor));
		const event = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", eventId),
			)
			.unique();
		if (!event) return empty();
		const result = await ctx.db
			.query("feedback")
			.withIndex("by_event_date", (q) =>
				q.eq("clubId", actor.clubId).eq("value.eventId", eventId),
			)
			.filter((q) =>
				q.and(
					q.eq(q.field("value.kind"), "shoutout"),
					q.eq(q.field("value.visibility"), "published"),
					q.or(...recipients.map((id) => q.eq(q.field("value.personId"), id))),
				),
			)
			.order("desc")
			.paginate(pageOptions(paginationOpts));
		return {
			...result,
			page: result.page.map((row) => publicFeedback(row.value)),
		};
	},
});
export const familyFeedback = query({
	args: {},
	handler: async (ctx): Promise<CoachingFeedback[]> => {
		const actor = await memberFor(ctx);
		if (!actor) return [];
		const rows = await Promise.all(
			[...new Set([actor.personId, ...actor.children])].map((personId) =>
				ctx.db
					.query("feedback")
					.withIndex("by_person_date", (q) =>
						q.eq("clubId", actor.clubId).eq("value.personId", personId),
					)
					.filter((q) => q.eq(q.field("value.visibility"), "published"))
					.order("desc")
					.take(5),
			),
		);
		return rows
			.flat()
			.map((row) => publicFeedback(row.value))
			.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
			.slice(0, 5);
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
	handler: equipmentLoanReturns,
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

const readHomeAnnouncementPage = async (
	ctx: QueryCtx,
	paginationOpts: PaginationOptions,
): Promise<PaginationResult<Notice>> => {
	const actor = await memberFor(ctx);
	if (!actor) return empty();
	const [club, people] = await Promise.all([
		ctx.db.get(actor.clubId),
		householdPeople(ctx, actor),
	]);
	const today = clubDate(undefined, club?.timeZone);
	const account = accountFor(actor);
	const programs = [
		...new Set([
			"all",
			...account.coachPrograms,
			...people.flatMap((person) => person.programs),
		]),
	];
	const candidates = await ctx.db
		.query("notices")
		.withIndex("by_date", (q) =>
			q.eq("clubId", actor.clubId).lte("value.date", today),
		)
		.order("desc")
		.filter((q) =>
			q.and(
				q.or(
					q.eq(q.field("value.expiresAt"), undefined),
					q.gt(q.field("value.expiresAt"), today),
				),
				...(account.admin
					? []
					: [
							q.or(
								...programs.map((program) =>
									q.eq(q.field("value.program"), program),
								),
							),
						]),
			),
		)
		.paginate({ ...pageOptions(paginationOpts), maximumRowsRead: 40 });
	return homeAnnouncementPage(
		{ ...candidates, page: candidates.page.map((row) => row.value) },
		account.id,
		today,
	);
};

export const homeAnnouncements = query({
	args: { today: v.string(), paginationOpts: paginationOptsValidator },
	handler: (ctx, { paginationOpts }): Promise<PaginationResult<Notice>> =>
		readHomeAnnouncementPage(ctx, paginationOpts),
});

export const homeAnnouncement = query({
	args: { today: v.string() },
	handler: async (ctx): Promise<Notice[]> =>
		(await readHomeAnnouncementPage(ctx, { numItems: 20, cursor: null })).page,
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
