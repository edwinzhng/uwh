import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
	type CoachingAssignment,
	type CoachingPractice,
	completedCoachingEvent,
	defaultCoachingDuration,
	validCoachingDuration,
} from "../src/domain/coaching-hours";
import { clubDate } from "../src/domain/event-time";
import { defaultSeasonId, initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireMember } from "./identity";

const requireCoach = async (ctx: QueryCtx): Promise<Doc<"memberships">> => {
	const actor = await requireMember(ctx);
	if (!actor.coachPrograms.length) throw new Error("Coach access required.");
	return actor;
};
const requireEvent = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	eventId: string,
): Promise<Doc<"events">> => {
	const event = await ctx.db
		.query("events")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", eventId),
		)
		.unique();
	if (!event || event.value.kind === "social")
		throw new Error("Choose a practice.");
	return event;
};
const assignmentsFor = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	eventId: string,
): Promise<CoachingAssignment[]> => {
	const rows = await ctx.db
		.query("coachingHours")
		.withIndex("by_club_event", (q) =>
			q.eq("clubId", clubId).eq("eventId", eventId),
		)
		.take(32);
	return rows.map(({ coachId, personId, name, durationMinutes }) => ({
		coachId,
		personId,
		name,
		durationMinutes,
	}));
};
export const eventCoaches = query({
	args: { eventId: v.string() },
	handler: async (ctx, args): Promise<CoachingAssignment[]> => {
		const actor = await requireCoach(ctx);
		await requireEvent(ctx, actor.clubId, args.eventId);
		return assignmentsFor(ctx, actor.clubId, args.eventId);
	},
});
export const coaches = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (
		ctx,
		args,
	): Promise<
		PaginationResult<{ coachId: Id<"users">; personId: string; name: string }>
	> => {
		const actor = await requireCoach(ctx);
		const page = await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(args.paginationOpts.numItems, 30),
			});
		return {
			...page,
			page: page.page
				.filter((member) => member.coachPrograms.length > 0)
				.map((member) => ({
					coachId: member.userId,
					personId: member.personId,
					name: member.name,
				})),
		};
	},
});
export const setCoach = mutation({
	args: {
		eventId: v.string(),
		coachId: v.string(),
		durationMinutes: v.optional(v.number()),
		assigned: v.boolean(),
	},
	handler: async (ctx, args): Promise<null> => {
		const actor = await requireCoach(ctx);
		const coachId = ctx.db.normalizeId("users", args.coachId);
		if (!coachId) throw new Error("Choose a coach.");
		const eventRow = await requireEvent(ctx, actor.clubId, args.eventId);
		const event = eventRow.value;
		if (event.cancelled) throw new Error("This practice is cancelled.");
		const existing = await ctx.db
			.query("coachingHours")
			.withIndex("by_club_event_coach", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("eventId", args.eventId)
					.eq("coachId", coachId),
			)
			.unique();
		if (!args.assigned) {
			if (existing) await ctx.db.delete(existing._id);
			return null;
		}
		const coach = await ctx.db
			.query("memberships")
			.withIndex("by_user", (q) => q.eq("userId", coachId))
			.unique();
		if (!coach || coach.clubId !== actor.clubId || !coach.coachPrograms.length)
			throw new Error("Choose an active coach in this club.");
		const durationMinutes =
			args.durationMinutes ??
			existing?.durationMinutes ??
			defaultCoachingDuration(event.date);
		if (!validCoachingDuration(durationMinutes))
			throw new Error("Choose 1, 1.5, 2, 2.5 or 3 hours.");
		if (!event.seasonId)
			await ctx.db.patch(eventRow._id, {
				value: { ...event, seasonId: defaultSeasonId },
			});
		if (existing)
			await ctx.db.patch(existing._id, { durationMinutes, name: coach.name });
		else {
			const assignments = await assignmentsFor(ctx, actor.clubId, args.eventId);
			if (assignments.length >= 32)
				throw new Error("A practice can have up to 32 coaches.");
			await ctx.db.insert("coachingHours", {
				clubId: actor.clubId,
				eventId: args.eventId,
				coachId: coach.userId,
				personId: coach.personId,
				name: coach.name,
				durationMinutes,
			});
		}
		return null;
	},
});
export const seasonPractices = query({
	args: { seasonId: v.string(), paginationOpts: paginationOptsValidator },
	handler: async (ctx, args): Promise<PaginationResult<CoachingPractice>> => {
		const actor = await requireCoach(ctx);
		const club = await ctx.db.get(actor.clubId);
		if (
			!(club?.seasons ?? initialSeasons).some(
				(season) => season.id === args.seasonId,
			)
		)
			throw new Error("Choose a season.");
		const now = Date.now();
		const page = await ctx.db
			.query("events")
			.withIndex("by_season_date", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("value.seasonId", args.seasonId)
					.lte("value.date", clubDate(now)),
			)
			.order("desc")
			.paginate({
				...args.paginationOpts,
				numItems: Math.min(args.paginationOpts.numItems, 25),
			});
		const practices = await Promise.all(
			page.page
				.filter((row) => completedCoachingEvent(row.value, now))
				.map(
					async ({ value }): Promise<CoachingPractice> => ({
						eventId: value.id,
						title: value.title,
						date: value.date,
						start: value.start,
						coaches: await assignmentsFor(ctx, actor.clubId, value.id),
					}),
				),
		);
		return {
			...page,
			page: practices.filter((practice) => practice.coaches.length > 0),
		};
	},
});
