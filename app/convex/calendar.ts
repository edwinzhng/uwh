import { v } from "convex/values";
import type { EventResponse } from "../src/domain/app-types";
import {
	type CalendarFeedInfo,
	calendarPendingWindow,
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../src/domain/calendar-export";
import { clubDate } from "../src/domain/event-time";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { getAuthUserId } from "./identity";
import { requireAcceptedTerms } from "./terms_access";

const hasCalendarHistory = (
	response: EventResponse,
	includeWaitlisted = false,
): boolean =>
	response.response === "going" ||
	(includeWaitlisted && response.response === "waiting") ||
	response.attendance === "present" ||
	response.attendance === "late" ||
	Boolean(
		response.partAttendance?.some(
			({ attendance }) => attendance === "present" || attendance === "late",
		),
	);

const calendarEvents = async (
	ctx: QueryCtx,
	club: Doc<"clubs">,
	respondedIds: string[],
	now: number,
): Promise<Doc<"events">["value"][]> => {
	const upcoming = await ctx.db
		.query("events")
		.withIndex("by_date", (q) =>
			q
				.eq("clubId", club._id)
				.gte("value.date", clubDate(now, club.timeZone))
				.lte(
					"value.date",
					clubDate(now + calendarPendingWindow, club.timeZone),
				),
		)
		.collect();
	const upcomingIds = new Set(upcoming.map(({ value }) => value.id));
	const other = await Promise.all(
		[...new Set(respondedIds)]
			.filter((id) => !upcomingIds.has(id))
			.map((id) =>
				ctx.db
					.query("events")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", club._id).eq("value.id", id),
					)
					.unique(),
			),
	);
	return [...upcoming, ...other].flatMap((row) => (row ? [row.value] : []));
};

const membershipForUser = async (
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<Doc<"memberships"> | null> =>
	ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.unique();
const ownsPerson = (
	membership: Doc<"memberships"> | null,
	personId: string,
): boolean =>
	Boolean(
		membership &&
			(membership.personId === personId ||
				membership.children.includes(personId)),
	);
const feedInfo = (feed: Doc<"calendarFeeds">): CalendarFeedInfo => ({
	personId: feed.personId,
	token: feed.token,
	includeWaitlisted: feed.includeWaitlisted,
});

export const list = query({
	args: {},
	handler: async (ctx): Promise<CalendarFeedInfo[]> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const membership = await membershipForUser(ctx, userId);
		const feeds = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		return feeds
			.filter(
				(feed) =>
					feed.clubId === membership?.clubId &&
					ownsPerson(membership, feed.personId),
			)
			.map(feedInfo);
	},
});

export const register = internalMutation({
	args: {
		userId: v.id("users"),
		personId: v.string(),
		token: v.string(),
		includeWaitlisted: v.boolean(),
		rotate: v.boolean(),
	},
	handler: async (
		ctx,
		{ userId, personId, token, includeWaitlisted, rotate },
	): Promise<CalendarFeedInfo> => {
		const membership = await membershipForUser(ctx, userId);
		if (!membership || !ownsPerson(membership, personId))
			throw new Error("Choose your profile or a linked child.");
		await requireAcceptedTerms(ctx, membership);
		const person = await ctx.db
			.query("members")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", membership.clubId).eq("value.id", personId),
			)
			.unique();
		if (!person) throw new Error("Profile unavailable.");
		const existing = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_user_person", (q) =>
				q.eq("userId", userId).eq("personId", personId),
			)
			.unique();
		if (existing) {
			if (existing.clubId !== membership.clubId)
				throw new Error("Remove the old calendar link first.");
			if (!rotate) return feedInfo(existing);
			await ctx.db.patch(existing._id, { token });
			return { ...feedInfo(existing), token };
		}
		if (rotate) throw new Error("Create a calendar link first.");
		await ctx.db.insert("calendarFeeds", {
			clubId: membership.clubId,
			userId,
			personId,
			token,
			includeWaitlisted,
		});
		return { personId, token, includeWaitlisted };
	},
});

export const preferences = mutation({
	args: { personId: v.string(), includeWaitlisted: v.boolean() },
	handler: async (ctx, { personId, includeWaitlisted }): Promise<null> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in first.");
		const membership = await membershipForUser(ctx, userId);
		const feed = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_user_person", (q) =>
				q.eq("userId", userId).eq("personId", personId),
			)
			.unique();
		if (
			!feed ||
			feed.clubId !== membership?.clubId ||
			!ownsPerson(membership, personId)
		)
			throw new Error("Calendar unavailable.");
		if (!membership) throw new Error("Calendar unavailable.");
		await requireAcceptedTerms(ctx, membership);
		await ctx.db.patch(feed._id, { includeWaitlisted });
		return null;
	},
});

export const disable = mutation({
	args: { personId: v.string() },
	handler: async (ctx, { personId }): Promise<null> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in first.");
		const feed = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_user_person", (q) =>
				q.eq("userId", userId).eq("personId", personId),
			)
			.unique();
		if (feed) {
			const entries = await ctx.db
				.query("calendarEntries")
				.withIndex("by_feed", (q) => q.eq("feedId", feed._id))
				.collect();
			for (const entry of entries) await ctx.db.delete(entry._id);
			await ctx.db.delete(feed._id);
		}
		return null;
	},
});

export const read = internalMutation({
	args: { token: v.string() },
	handler: async (ctx, { token }): Promise<string | null> => {
		if (!/^[a-f0-9]{64}$/.test(token)) return null;
		const feed = await ctx.db
			.query("calendarFeeds")
			.withIndex("by_token", (q) => q.eq("token", token))
			.unique();
		if (!feed) return null;
		const membership = await membershipForUser(ctx, feed.userId);
		if (
			membership?.clubId !== feed.clubId ||
			!ownsPerson(membership, feed.personId)
		)
			return null;
		const [club, member, responses, previous] = await Promise.all([
			ctx.db.get(feed.clubId),
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", feed.clubId).eq("value.id", feed.personId),
				)
				.unique(),
			ctx.db
				.query("responses")
				.withIndex("by_person", (q) =>
					q.eq("clubId", feed.clubId).eq("value.personId", feed.personId),
				)
				.collect(),
			ctx.db
				.query("calendarEntries")
				.withIndex("by_feed", (q) => q.eq("feedId", feed._id))
				.collect(),
		]);
		if (!club || !member || member.value.archived || member.value.mergedInto)
			return null;
		const now = Date.now();
		const events = await calendarEvents(
			ctx,
			club,
			responses
				.filter(({ value }) =>
					hasCalendarHistory(value, feed.includeWaitlisted),
				)
				.map(({ value }) => value.eventId),
			now,
		);
		const projected = personalCalendarEvents(
			events,
			responses.map((entry) => entry.value),
			feed.personId,
			member.value.programs,
			feed.includeWaitlisted,
			now,
		);
		const entries = reconcileCalendar(
			previous.map((entry) => entry.value),
			projected,
			feed.clubId,
			feed.personId,
			Date.now(),
		);
		const previousByEvent = new Map(
			previous.map((entry) => [entry.value.eventId, entry]),
		);
		for (const value of entries) {
			const before = previousByEvent.get(value.eventId);
			if (!before)
				await ctx.db.insert("calendarEntries", { feedId: feed._id, value });
			else if (before.value.sequence !== value.sequence)
				await ctx.db.patch(before._id, { value });
		}
		return renderCalendar(`${club.name} · ${member.value.name}`, entries);
	},
});

export const householdSnapshot = query({
	args: { personIds: v.array(v.string()) },
	handler: async (ctx, { personIds }): Promise<string> => {
		const userId = await getAuthUserId(ctx);
		const membership = userId ? await membershipForUser(ctx, userId) : null;
		if (
			!membership ||
			!personIds.length ||
			personIds.some((id) => !ownsPerson(membership, id))
		)
			throw new Error("Choose your profile or a linked child.");
		const club = await ctx.db.get(membership.clubId);
		if (!club) throw new Error("Club unavailable.");
		const household = await Promise.all(
			[...new Set(personIds)].map(async (personId) => {
				const [person, responses] = await Promise.all([
					ctx.db
						.query("members")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", membership.clubId).eq("value.id", personId),
						)
						.unique(),
					ctx.db
						.query("responses")
						.withIndex("by_person", (q) =>
							q.eq("clubId", membership.clubId).eq("value.personId", personId),
						)
						.collect(),
				]);
				return { person, responses };
			}),
		);
		const now = Date.now();
		const events = await calendarEvents(
			ctx,
			club,
			household.flatMap(({ responses }) =>
				responses
					.filter(({ value }) => hasCalendarHistory(value))
					.map(({ value }) => value.eventId),
			),
			now,
		);
		return renderCalendar(
			club.name,
			household.flatMap(({ person, responses }) =>
				person && !person.value.archived && !person.value.mergedInto
					? reconcileCalendar(
							[],
							personalCalendarEvents(
								events,
								responses.map((row) => row.value),
								person.value.id,
								person.value.programs,
								false,
								now,
							).map((event) => ({
								...event,
								title: `${event.title} · ${person.value.name}`,
							})),
							membership.clubId,
							person.value.id,
							Date.now(),
						)
					: [],
			),
		);
	},
});
