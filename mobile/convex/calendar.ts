import { v } from "convex/values";
import {
	type CalendarFeedInfo,
	personalCalendarEvents,
	reconcileCalendar,
	renderCalendar,
} from "../src/domain/calendar-export";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { getAuthUserId } from "./identity";

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
		if (!club || !member) return null;
		const eventIds = [
			...new Set(
				responses
					.filter(
						(row) =>
							row.value.response === "going" ||
							(feed.includeWaitlisted && row.value.response === "waiting"),
					)
					.map((row) => row.value.eventId),
			),
		];
		const events = await Promise.all(
			eventIds.map((id) =>
				ctx.db
					.query("events")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", feed.clubId).eq("value.id", id),
					)
					.unique(),
			),
		);
		const projected = personalCalendarEvents(
			events.flatMap((entry) => (entry ? [entry.value] : [])),
			responses.map((entry) => entry.value),
			feed.personId,
			member.value.programs,
			feed.includeWaitlisted,
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
